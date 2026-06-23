"""
AutomationEdge T4 integration service.

Handles authentication and workflow execution for PAN card data extraction.
All configuration is read from .env:

  AE_T4_BASE_URL       — e.g. https://t4.automationedge.com
  AE_T4_USERNAME       — AE login username
  AE_T4_PASSWORD       — AE login password
  AE_T4_ORG_CODE       — orgCode sent in workflow execute request
  AE_T4_WORKFLOW_NAME  — workflowName sent in workflow execute request
  AE_T4_EXECUTE_PATH   — URL path for workflow execution  (default: /aeengine/rest/execute)
  AE_T4_AUTH_HEADER    — Header name used to pass the session token (default: Authorization)
"""

import os
import time
import logging
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)

# ── Config from .env ──────────────────────────────────────────────────────────
AE_BASE_URL      = os.environ.get("AE_T4_BASE_URL",      "https://t4.automationedge.com").rstrip("/")
AE_USERNAME      = os.environ.get("AE_T4_USERNAME",      "")
AE_PASSWORD      = os.environ.get("AE_T4_PASSWORD",      "")
AE_EXECUTE_PATH  = os.environ.get("AE_T4_EXECUTE_PATH",  "/aeengine/rest/execute")
AE_AUTH_HEADER   = os.environ.get("AE_T4_AUTH_HEADER",   "Authorization")
AE_USER_ID       = os.environ.get("AE_T4_USER_ID",       "")
AE_SOURCE        = os.environ.get("AE_T4_SOURCE",        "VendorPortal")
AE_AGENT_NAME    = os.environ.get("AE_T4_AGENT_NAME",    "")

# document_type (from frontend/DB) → (workflow_name, file_param_name)
DOCUMENT_WORKFLOW_MAP: dict[str, tuple[str, str]] = {
    "PAN Card":                     ("OCR_PanCard",          "PAN_Input_File"),
    "Certificate of Incorporation": ("OCR_COI",              "COI_Input_File"),
    "GST Certificate":              ("OCR_GST_Certificate",  "GST_Input_File"),
    "Cancelled Cheque":             ("OCR_Cancelled_Cheque", "CancelCheck_Input_File"),
    "MSME Certificate":             ("OCR_MSME",             "MSME_Udyam_Input_File"),
    "Bank Statement":               ("OCR_BankStatement",    "Bank_Statment_Input_File"),
}
AUTH_ENDPOINT    = f"{AE_BASE_URL}/aeengine/rest/authenticate"
EXECUTE_ENDPOINT = f"{AE_BASE_URL}{AE_EXECUTE_PATH}"

# Session is cached so Tomcat JSESSIONID cookie is preserved between auth and execute
TOKEN_TTL_SECONDS = 55 * 60

# ── Persistent requests.Session (carries JSESSIONID cookie from auth → execute) ──
_ae_session:       requests.Session | None = None
_cached_token:     str | None              = None
_cached_username:  str                     = ""
_cached_org_code:  str                     = ""
_token_fetched_at: float                   = 0.0


def _token_is_fresh() -> bool:
    return _cached_token is not None and (time.time() - _token_fetched_at) < TOKEN_TTL_SECONDS


def get_ae_session(force_refresh: bool = False) -> tuple[requests.Session, str]:
    """
    Authenticate with AE T4 and return (session, token).

    Uses a persistent requests.Session so the Tomcat JSESSIONID cookie set during
    /authenticate is automatically sent on all subsequent requests (including /execute).
    Re-authenticates only when the cached token is stale.

    Raises RuntimeError if credentials are missing or auth fails.
    """
    global _ae_session, _cached_token, _cached_username, _cached_org_code, _token_fetched_at

    if not force_refresh and _token_is_fresh() and _ae_session is not None:
        return _ae_session, _cached_token  # type: ignore[return-value]

    if not AE_USERNAME or not AE_PASSWORD:
        raise RuntimeError(
            "AutomationEdge credentials not configured. "
            "Set AE_T4_USERNAME and AE_T4_PASSWORD in .env"
        )

    session = requests.Session()

    try:
        resp = session.post(
            AUTH_ENDPOINT,
            data={"username": AE_USERNAME, "password": AE_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15,
            verify=True,
        )
    except requests.exceptions.RequestException as exc:
        print(f"[AE] AUTH REQUEST FAILED: {exc}")
        raise RuntimeError(f"AE T4 authentication failed: {exc}") from exc

    if not resp.ok:
        print(f"[AE] AUTH HTTP {resp.status_code}: {resp.text[:400]}")
        raise RuntimeError(
            f"AE T4 authentication failed (HTTP {resp.status_code}): {resp.text[:300]}"
        )

    try:
        data = resp.json()
    except ValueError:
        print(f"[AE] AUTH RESPONSE NOT JSON: {resp.text[:300]}")
        raise RuntimeError(f"AE T4 auth response is not JSON: {resp.text[:200]}")

    # Print full auth response so we can see every field (visible in Django console)
    print(f"[AE] AUTH RESPONSE: {data}")
    print(f"[AE] AUTH COOKIES:  {dict(session.cookies)}")

    token = (
        data.get("sessionToken")
        or data.get("token")
        or data.get("access_token")
        or data.get("authToken")
        or data.get("session_token")
        or data.get("sessionid")
    )

    if not token:
        raise RuntimeError(
            f"AE T4 auth OK (HTTP 200) but no token in response. "
            f"Full response: {data}"
        )

    print(f"[AE] TOKEN (first 16): {token[:16]}…")

    _ae_session       = session
    _cached_token     = token
    _cached_username  = data.get("userName", "")
    _cached_org_code  = (data.get("tenant") or {}).get("orgCode", _cached_org_code)
    _token_fetched_at = time.time()
    print(f"[AE] Cached orgCode from auth: {_cached_org_code}")
    return session, token


def get_ae_token(force_refresh: bool = False) -> str:
    """Convenience wrapper — returns only the token string."""
    _, token = get_ae_session(force_refresh=force_refresh)
    return token


# ── Agent status check ────────────────────────────────────────────────────────

def check_agent_running() -> None:
    """
    Verifies that at least one AE T4 agent has agentState == 'RUNNING'.
    Raises RuntimeError with the actual agent state(s) if none are running.
    """
    session, token = get_ae_session()
    org_code = _cached_org_code or _cached_org_code
    url = f"{AE_BASE_URL}/aeengine/rest/{org_code}/monitoring/agents"

    headers = {
        "Content-Type":    "application/json",
        "X-session-token": token,
    }

    print(f"[AE] Checking agent status → {url}")

    try:
        resp = session.post(
            url,
            params={"type": "AGENT", "offset": 0, "size": 10},
            headers=headers,
            timeout=15,
            verify=False,
        )
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"AE T4 agent check request failed: {exc}") from exc

    print(f"[AE] Agent check HTTP {resp.status_code}: {resp.text[:600]}")

    if not resp.ok:
        raise RuntimeError(
            f"AE T4 agent check returned HTTP {resp.status_code}: {resp.text[:200]}"
        )

    try:
        data = resp.json()
    except ValueError:
        raise RuntimeError(f"AE T4 agent check response is not JSON: {resp.text[:200]}")

    # Normalise — response may be a plain list or wrapped in a dict
    if isinstance(data, list):
        agents = data
    elif isinstance(data, dict):
        # Try every common wrapper key; fall back to treating the dict itself as one agent
        agents = (
            data.get("data")
            or data.get("content")
            or data.get("agents")
            or data.get("result")
        )
        if agents is None:
            # Single agent returned directly as a dict
            agents = [data] if data.get("agentState") else []
        elif not isinstance(agents, list):
            agents = list(agents) if agents else []
    else:
        agents = []

    print(f"[AE] Parsed {len(agents)} agent(s): {[{a.get('agentName'), a.get('agentState')} for a in agents]}")

    if AE_AGENT_NAME:
        # Check only the specific configured agent
        target = next((a for a in agents if a.get("agentName") == AE_AGENT_NAME), None)

        if target is None:
            raise RuntimeError(
                f"Configured agent '{AE_AGENT_NAME}' was not found in the agent list. "
                f"Available agents: {[a.get('agentName') for a in agents]}"
            )

        state = target.get("agentState", "UNKNOWN")
        if state == "RUNNING":
            print(f"[AE] ✓ Agent '{AE_AGENT_NAME}' is RUNNING.")
            return

        raise RuntimeError(
            f"Agent '{AE_AGENT_NAME}' is in {state} state. Please start the agent."
        )

    # No specific agent configured — check if ANY agent is RUNNING
    running = [a for a in agents if a.get("agentState") == "RUNNING"]
    if running:
        print(f"[AE] ✓ Running agent(s): {[a.get('agentName') for a in running]}")
        return

    if agents:
        state_parts = [
            f"'{a.get('agentName', 'unknown')}' is {a.get('agentState', 'UNKNOWN')}"
            for a in agents
        ]
        raise RuntimeError(
            "Agent is in " + "; ".join(state_parts) + " state. Please start the agent."
        )

    raise RuntimeError(
        "No AE T4 agents found for this organisation. Please start an agent."
    )


# ── Workflow execution ────────────────────────────────────────────────────────

def execute_document_workflow(document_type: str, abs_file_path: str, document_id: int) -> dict:
    """
    Trigger the AE T4 workflow corresponding to document_type.
    Workflow name and input parameter name are looked up from DOCUMENT_WORKFLOW_MAP.
    Raises RuntimeError if document_type has no mapped workflow or agent is not RUNNING.
    """
    mapping = DOCUMENT_WORKFLOW_MAP.get(document_type)
    if not mapping:
        raise RuntimeError(
            f"No workflow configured for document type '{document_type}'. "
            f"Supported types: {list(DOCUMENT_WORKFLOW_MAP.keys())}"
        )
    workflow_name, file_param_name = mapping

    # Verify agent is RUNNING and populate _cached_org_code from auth response
    check_agent_running()

    session, token = get_ae_session()

    body = {
        "orgCode":      _cached_org_code,
        "workflowName": workflow_name,
        "params": [
            {
                "name":  file_param_name,
                "value": abs_file_path,
                "type":  "String",
            },
            {
                "name":  "documentId",
                "value": str(document_id),
                "type":  "String",
            },
        ],
    }

    headers = {
        "Content-Type":    "application/json",
        "X-session-token": token,
    }

    print(f"[AE] EXECUTE → {EXECUTE_ENDPOINT}")
    print(f"[AE] BODY    → {body}")

    try:
        resp = session.post(EXECUTE_ENDPOINT, json=body, headers=headers,
                            timeout=60, verify=False)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"AE T4 execute request failed: {exc}") from exc

    print(f"[AE] RESPONSE {resp.status_code}: {resp.text[:400]}")

    if not resp.ok:
        raise RuntimeError(
            f"AE T4 workflow returned HTTP {resp.status_code}: {resp.text[:300]}"
        )

    try:
        result = resp.json()
    except ValueError:
        result = {"raw": resp.text}

    print(f"[AE] WORKFLOW SUCCESS: {result}")
    return result


# ── Workflow status (single request) ─────────────────────────────────────────

def get_workflow_status(automation_request_id: int) -> str:
    """
    GET /aeengine/rest/workflowinstances/{automation_request_id}
    Returns the workflow status string: Queued / Executing / Complete / Failure / etc.
    """
    session, token = get_ae_session()
    url = f"{AE_BASE_URL}/aeengine/rest/workflowinstances/{automation_request_id}"
    headers = {
        "Content-Type":    "application/json",
        "X-session-token": token,
    }
    try:
        resp = session.get(url, headers=headers, timeout=15, verify=False)
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(f"Workflow status request failed: {exc}") from exc

    if not resp.ok:
        raise RuntimeError(
            f"Workflow status returned HTTP {resp.status_code}: {resp.text[:200]}"
        )

    data = resp.json()
    return data.get("status", "Unknown")


# ── Workflow result polling ────────────────────────────────────────────────────
