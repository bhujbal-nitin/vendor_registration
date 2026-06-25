import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from django.conf import settings

_tls_context = ssl.create_default_context()
_tls_context.check_hostname = False
_tls_context.verify_mode = ssl.CERT_NONE


def send_password_email(to_email: str, plain_password: str, registration_no: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Vendor Portal Account Credentials"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email

    text_body = f"""\
Welcome to the Vendor Registration Portal!

Your account has been created successfully.

Registration Number : {registration_no}
Email               : {to_email}
Password            : {plain_password}

Please log in and change your password on first sign-in.

This is an auto-generated email. Do not reply.
"""

    html_body = f"""\
<html>
  <body style="font-family:Arial,sans-serif;color:#1A1A2E;padding:20px;margin:0;">
    <div style="max-width:520px;margin:0 auto;border:1px solid #F3F4F6;border-radius:10px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B00,#FF8C33);padding:28px;text-align:center;">
        <h2 style="color:#fff;margin:0;font-size:22px;">Vendor Portal</h2>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">Account Created Successfully</p>
      </div>
      <div style="padding:28px;">
        <p style="margin-top:0;">Welcome! Your vendor account has been set up.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:10px 12px;background:#FFF5EE;border-radius:6px 0 0 6px;color:#6B7280;font-size:13px;font-weight:600;width:42%;">Registration No.</td>
            <td style="padding:10px 12px;background:#FFF5EE;border-radius:0 6px 6px 0;font-weight:700;color:#FF6B00;">{registration_no}</td>
          </tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;color:#6B7280;font-size:13px;font-weight:600;">Email</td>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;">{to_email}</td>
          </tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;color:#6B7280;font-size:13px;font-weight:600;">Password</td>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-family:monospace;font-weight:700;font-size:15px;">{plain_password}</td>
          </tr>
        </table>
        <p style="font-size:13px;color:#6B7280;margin-bottom:0;">
          You will be asked to change your password on first login.
        </p>
        <p style="font-size:11px;color:#9CA3AF;margin-top:24px;border-top:1px solid #F3F4F6;padding-top:12px;">
          This is an auto-generated email. Please do not reply.
        </p>
      </div>
    </div>
  </body>
</html>
"""

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls(context=_tls_context)
        smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())


# ── Per-action email configs ──────────────────────────────────────────────────
_ACTION_CFG = {
    "APPROVED": {
        "header_bg":    "linear-gradient(135deg,#059669,#10B981)",
        "header_title": "Registration Approved",
        "header_sub":   "Your vendor registration has been approved",
        "icon":         "✓",
        "icon_bg":      "#D1FAE5",
        "icon_color":   "#059669",
        "body_heading": "Congratulations!",
        "body_text":    (
            "We are pleased to inform you that your vendor registration has been "
            "<strong>approved</strong> by our finance team. You are now an approved "
            "vendor and your details will be processed accordingly."
        ),
        "footer_text":  "Welcome aboard! If you have any questions, please contact our finance team.",
        "show_remarks": False,
        "label":        "Approved",
    },
    "REJECTED": {
        "header_bg":    "linear-gradient(135deg,#DC2626,#EF4444)",
        "header_title": "Registration Not Approved",
        "header_sub":   "Your vendor registration could not be approved",
        "icon":         "✕",
        "icon_bg":      "#FEE2E2",
        "icon_color":   "#DC2626",
        "body_heading": "Application Not Approved",
        "body_text":    (
            "After careful review, our finance team has determined that your vendor "
            "registration <strong>cannot be approved</strong> at this time. Please "
            "review the comments below and contact our team if you have any questions."
        ),
        "footer_text":  "If you believe this decision is incorrect, please contact our finance team.",
        "show_remarks": True,
        "label":        "Rejected",
    },
    "SEND_BACK": {
        "header_bg":    "linear-gradient(135deg,#D97706,#F59E0B)",
        "header_title": "Action Required",
        "header_sub":   "Your registration form needs corrections",
        "icon":         "↩",
        "icon_bg":      "#FEF3C7",
        "icon_color":   "#D97706",
        "body_heading": "Please Update Your Registration",
        "body_text":    (
            "Our finance team has reviewed your vendor registration and found that "
            "some information needs to be corrected or updated. Your form has been "
            "<strong>sent back</strong> for your attention. Please log in to the "
            "Vendor Portal, review the comments below, make the necessary changes, "
            "and resubmit your application."
        ),
        "footer_text":  "Please log in to the Vendor Portal to edit and resubmit your form.",
        "show_remarks": True,
        "label":        "Sent Back",
    },
}


def send_vendor_status_email(
    to_email: str,
    vendor_name: str,
    registration_no: str,
    action: str,
    remarks: str = "",
) -> None:
    """
    Send a status-update notification email to a vendor.
    action must be one of: 'Approved', 'Rejected', 'Sent Back'.
    """
    cfg = _ACTION_CFG.get(action)
    if not cfg:
        raise ValueError(f"No email template defined for action '{action}'")

    subject_map = {
        "APPROVED":  f"Congratulations! Your Vendor Registration {registration_no} has been Approved",
        "REJECTED":  f"Vendor Registration {registration_no} — Application Not Approved",
        "SEND_BACK": f"Action Required: Vendor Registration {registration_no} Needs Corrections",
    }
    subject = subject_map[action]

    remarks_block_html = ""
    remarks_block_text = ""
    if cfg["show_remarks"] and remarks:
        remarks_block_html = f"""\
        <div style="margin:18px 0;padding:14px 16px;background:#FFF8F3;border-left:4px solid #FF6B00;border-radius:4px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.05em;">
            Comments from Finance Team
          </p>
          <p style="margin:0;font-size:13px;color:#374151;font-style:italic;">"{remarks}"</p>
        </div>"""
        remarks_block_text = f"\n\nComments from Finance Team:\n\"{remarks}\"\n"

    html_body = f"""\
<html>
  <body style="font-family:Arial,sans-serif;color:#1A1A2E;padding:20px;margin:0;background:#F7F8FA;">
    <div style="max-width:540px;margin:0 auto;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.06);">

      <!-- Header -->
      <div style="background:{cfg['header_bg']};padding:32px 28px;text-align:center;">
        <div style="width:52px;height:52px;border-radius:50%;background:{cfg['icon_bg']};display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:24px;color:{cfg['icon_color']};font-weight:700;">{cfg['icon']}</span>
        </div>
        <h2 style="color:#fff;margin:0;font-size:20px;font-weight:700;">{cfg['header_title']}</h2>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">{cfg['header_sub']}</p>
      </div>

      <!-- Body -->
      <div style="padding:28px;">
        <p style="margin-top:0;font-size:15px;font-weight:700;color:#1A1A2E;">{cfg['body_heading']}</p>
        <p style="font-size:13px;color:#374151;line-height:1.6;margin-bottom:16px;">
          Dear <strong>{vendor_name}</strong>,
        </p>
        <p style="font-size:13px;color:#374151;line-height:1.6;">{cfg['body_text']}</p>

        <!-- Registration details -->
        <table style="width:100%;border-collapse:collapse;margin:18px 0;">
          <tr>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;color:#6B7280;font-size:12px;font-weight:700;width:44%;text-transform:uppercase;letter-spacing:0.04em;">Registration No.</td>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-weight:700;color:#FF6B00;font-family:monospace;font-size:14px;">{registration_no}</td>
          </tr>
          <tr><td colspan="2" style="height:6px;"></td></tr>
          <tr>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;color:#6B7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Status</td>
            <td style="padding:10px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-weight:700;color:#1A1A2E;">{cfg['label']}</td>
          </tr>
        </table>

        {remarks_block_html}

        <p style="font-size:12px;color:#6B7280;margin-top:24px;line-height:1.6;">{cfg['footer_text']}</p>
        <p style="font-size:11px;color:#9CA3AF;margin-top:20px;padding-top:14px;border-top:1px solid #F3F4F6;">
          This is an auto-generated email from the Vendor Registration Portal. Please do not reply.
        </p>
      </div>
    </div>
  </body>
</html>"""

    text_body = f"""\
{cfg['body_heading']}

Dear {vendor_name},

Registration No. : {registration_no}
Status           : {action}
{remarks_block_text}
{cfg['footer_text']}

This is an auto-generated email. Do not reply.
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
        smtp.ehlo()
        smtp.starttls(context=_tls_context)
        smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
        smtp.sendmail(settings.SMTP_USER, to_email, msg.as_string())
