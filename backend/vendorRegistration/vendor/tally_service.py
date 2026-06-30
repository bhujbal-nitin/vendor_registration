"""
Tally integration service.

Creates a vendor ledger in Tally via its XML HTTP gateway when a vendor
registration is approved. All configuration is read from .env:

  TALLY_URL                      — e.g. http://localhost:9000
  TALLY_COMPANY_NAME             — exact company name as it appears in Tally
  TALLY_LEDGER_PARENT            — ledger group new vendors are created under
  TALLY_ISBILLWISEON             — Yes/No
  TALLY_GST_REGISTRATION_TYPE    — e.g. Regular
  TALLY_COUNTRY                  — e.g. India
  TALLY_TRANSACTION_NAME         — bank transaction label, e.g. Primary
  TALLY_DEFAULT_TRANSACTION_TYPE — e.g. e-Fund Transfer
"""

import os
import logging
import datetime
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape as xml_escape

import requests

logger = logging.getLogger(__name__)

# ── Config from .env ──────────────────────────────────────────────────────────
TALLY_URL              = os.environ.get("TALLY_URL", "http://localhost:9000").rstrip("/")
TALLY_COMPANY_NAME     = os.environ.get("TALLY_COMPANY_NAME", "")
TALLY_LEDGER_PARENT    = os.environ.get("TALLY_LEDGER_PARENT", "Sundry Creditors")
TALLY_ISBILLWISEON     = os.environ.get("TALLY_ISBILLWISEON", "Yes")
TALLY_GST_REG_TYPE     = os.environ.get("TALLY_GST_REGISTRATION_TYPE", "Regular")
TALLY_COUNTRY          = os.environ.get("TALLY_COUNTRY", "India")
TALLY_TRANSACTION_NAME = os.environ.get("TALLY_TRANSACTION_NAME", "Primary")
TALLY_DEFAULT_TXN_TYPE = os.environ.get("TALLY_DEFAULT_TRANSACTION_TYPE", "e-Fund Transfer")
TALLY_FY_START_MONTH   = int(os.environ.get("TALLY_FY_START_MONTH", "4"))
TALLY_FY_START_DAY     = int(os.environ.get("TALLY_FY_START_DAY", "1"))


def _financial_year_start() -> str:
    """
    Return the start date of the current financial year as YYYYMMDD.

    Tally's LEDMAILINGDETAILS.LIST / LEDGSTREGDETAILS.LIST entries are
    effective-dated — an APPLICABLEFROM set to "today" can land after
    Tally's own current period date and show as "Not Applicable" in the UI.
    Anchoring to the FY start avoids that.
    """
    today = datetime.date.today()
    year = today.year if (today.month, today.day) >= (TALLY_FY_START_MONTH, TALLY_FY_START_DAY) else today.year - 1
    return datetime.date(year, TALLY_FY_START_MONTH, TALLY_FY_START_DAY).strftime("%Y%m%d")


def _x(value) -> str:
    """
    XML-escape a value for safe use in both element text and quoted attributes
    (e.g. NAME="..."); treat None/falsy as empty string.
    """
    return xml_escape(str(value or ""), {'"': "&quot;", "'": "&apos;"})


def build_ledger_xml(vendor: dict) -> str:
    """
    Build the Tally XML payload to create a vendor (Sundry Creditor) ledger.

    Expected keys in `vendor`:
      name, pan, address, state, pincode, gstin,
      bank_name, ifsc_code, account_number, account_holder_name
    """
    applicable_from = _financial_year_start()
    name = _x(vendor.get("name"))

    return f"""<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>IMPORT</TALLYREQUEST>
    <TYPE>DATA</TYPE>
    <ID>All Masters</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>{_x(TALLY_COMPANY_NAME)}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <LEDGER NAME="{name}" ACTION="Create">
          <NAME>{name}</NAME>
          <PARENT>{_x(TALLY_LEDGER_PARENT)}</PARENT>
          <ISBILLWISEON>{_x(TALLY_ISBILLWISEON)}</ISBILLWISEON>
          <INCOMETAXNUMBER>{_x(vendor.get("pan"))}</INCOMETAXNUMBER>

          <MAILINGNAME>{name}</MAILINGNAME>
          <LEDMAILINGDETAILS.LIST>
            <APPLICABLEFROM>{applicable_from}</APPLICABLEFROM>
            <MAILINGNAME>{name}</MAILINGNAME>
            <ADDRESS.LIST TYPE="String">
              <ADDRESS>{_x(vendor.get("address"))}</ADDRESS>
            </ADDRESS.LIST>
            <STATE>{_x(vendor.get("state"))}</STATE>
            <COUNTRY>{_x(TALLY_COUNTRY)}</COUNTRY>
            <PINCODE>{_x(vendor.get("pincode"))}</PINCODE>
          </LEDMAILINGDETAILS.LIST>

          <LEDGSTREGDETAILS.LIST>
            <APPLICABLEFROM>{applicable_from}</APPLICABLEFROM>
            <GSTREGISTRATIONTYPE>{_x(TALLY_GST_REG_TYPE)}</GSTREGISTRATIONTYPE>
            <PLACEOFSUPPLY>{_x(vendor.get("state"))}</PLACEOFSUPPLY>
            <GSTIN>{_x(vendor.get("gstin"))}</GSTIN>
          </LEDGSTREGDETAILS.LIST>

          <PAYMENTDETAILS.LIST>
            <IFSCODE>{_x(vendor.get("ifsc_code"))}</IFSCODE>
            <BANKNAME>{_x(vendor.get("bank_name"))}</BANKNAME>
            <ACCOUNTNUMBER>{_x(vendor.get("account_number"))}</ACCOUNTNUMBER>
            <PAYMENTFAVOURING>{_x(vendor.get("account_holder_name"))}</PAYMENTFAVOURING>
            <TRANSACTIONNAME>{_x(TALLY_TRANSACTION_NAME)}</TRANSACTIONNAME>
            <DEFAULTTRANSACTIONTYPE>{_x(TALLY_DEFAULT_TXN_TYPE)}</DEFAULTTRANSACTIONTYPE>
          </PAYMENTDETAILS.LIST>

        </LEDGER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>"""


def _parse_tally_response(raw_xml: str) -> tuple[bool, str]:
    """
    Parse Tally's XML import response and decide success/failure.
    Fail-safe: anything we can't positively confirm as created is treated as a failure.
    """
    try:
        root = ET.fromstring(raw_xml)
    except ET.ParseError:
        snippet = raw_xml.strip()[:300]
        return False, f"Tally returned an unparseable response: {snippet}"

    line_error = root.findtext(".//LINEERROR")
    if line_error and line_error.strip():
        return False, line_error.strip()

    def _int(tag: str) -> int:
        text = root.findtext(f".//{tag}")
        try:
            return int(text) if text else 0
        except ValueError:
            return 0

    errors  = _int("ERRORS")
    created = _int("CREATED")
    altered = _int("ALTERED")

    if errors > 0:
        return False, f"Tally reported {errors} error(s) while creating the ledger."

    if created >= 1 or altered >= 1:
        return True, "Ledger created successfully in Tally."

    return False, f"Tally did not confirm ledger creation. Raw response: {raw_xml.strip()[:300]}"


def create_vendor_ledger(vendor: dict) -> dict:
    """
    POST the vendor ledger XML to Tally and verify it was created.

    Never raises — always returns a dict so the caller can log every sync
    attempt (success or failure) with the full request/response payload:
      {
        "success":          bool,
        "message":          str,
        "request_payload":  str,  # XML sent to Tally
        "response_payload": str,  # raw response text (empty if unreachable)
      }
    """
    xml_payload = build_ledger_xml(vendor)

    if not TALLY_COMPANY_NAME:
        return {
            "success": False,
            "message": "TALLY_COMPANY_NAME is not configured in .env.",
            "request_payload": xml_payload,
            "response_payload": "",
        }

    logger.info("[Tally] POST %s — creating ledger '%s' in company '%s'",
                TALLY_URL, vendor.get("name"), TALLY_COMPANY_NAME)

    try:
        resp = requests.post(
            TALLY_URL,
            data=xml_payload.encode("utf-8"),
            headers={"Content-Type": "text/xml"},
            timeout=30,
        )
    except requests.exceptions.RequestException as exc:
        message = f"Could not reach Tally at {TALLY_URL}: {exc}"
        logger.error("[Tally] %s", message)
        return {
            "success": False,
            "message": message,
            "request_payload": xml_payload,
            "response_payload": "",
        }

    if not resp.ok:
        message = f"Tally returned HTTP {resp.status_code}: {resp.text[:300]}"
        logger.error("[Tally] %s", message)
        return {
            "success": False,
            "message": message,
            "request_payload": xml_payload,
            "response_payload": resp.text,
        }

    success, message = _parse_tally_response(resp.text)
    logger.info("[Tally] Response: success=%s message=%s", success, message)

    return {
        "success": success,
        "message": message,
        "request_payload": xml_payload,
        "response_payload": resp.text,
    }
