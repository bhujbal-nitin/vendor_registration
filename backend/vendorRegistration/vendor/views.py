import os
import re
import uuid
import datetime
import mimetypes
from difflib import SequenceMatcher
from pathlib import Path

from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import VendorRegistration, VendorUser, VendorDocument, VendorProfile, VendorGST, VendorBankDetails, VendorContactDetails, VendorDocumentExtraction, VendorFieldChangeLog, VendorComparisonResult, VendorApprovalHistory, VendorNotification
from .serializers import (
    RegisterRequestSerializer, LoginRequestSerializer, DocumentSerializer,
    RegistrationFormSerializer, VendorProfileSerializer, VendorGSTSerializer,
    VendorBankDetailsSerializer, VendorContactDetailsSerializer,
)
from .utils.password import generate_password, hash_password, verify_password
from .ae_service import get_ae_token, execute_document_workflow, DOCUMENT_WORKFLOW_MAP, get_workflow_status

import logging
logger = logging.getLogger(__name__)
from .utils.registration import generate_registration_no
from .utils.email import send_password_email

MAX_FAILED_ATTEMPTS = 5


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pan_number = serializer.validated_data["pan_number"].upper()
        email      = serializer.validated_data["email"].lower()

        if VendorRegistration.objects.filter(pan_number=pan_number).exists():
            return Response(
                {"detail": "A vendor with this PAN number is already registered."},
                status=status.HTTP_409_CONFLICT,
            )

        if VendorUser.objects.filter(email=email).exists():
            return Response(
                {"detail": "This email address is already registered."},
                status=status.HTTP_409_CONFLICT,
            )

        registration_no = generate_registration_no()

        vendor_reg = VendorRegistration.objects.create(
            registration_no=registration_no,
            pan_number=pan_number,
            email=email,
            registration_status="Draft",
        )

        plain_password = generate_password()
        VendorUser.objects.create(
            registration=vendor_reg,
            email=email,
            password_hash=hash_password(plain_password),
            account_status="Active",
            must_change_password="Y",
            failed_login_attempts=0,
            created_by="SYSTEM",
        )

        try:
            send_password_email(email, plain_password, registration_no)
        except Exception as exc:
            print(f"[email] Failed to send credentials to {email}: {exc}")

        return Response(
            {
                "message": "Registration successful. Check your email for login credentials.",
                "registration_no": registration_no,
                "email": email,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pan_number = serializer.validated_data["pan_number"].upper()
        password   = serializer.validated_data["password"]

        try:
            vendor_reg = VendorRegistration.objects.get(pan_number=pan_number)
        except VendorRegistration.DoesNotExist:
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            vendor_user = vendor_reg.vendor_user
        except VendorUser.DoesNotExist:
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if vendor_user.account_status == "Locked":
            return Response(
                {"detail": "Account locked due to too many failed attempts. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if vendor_user.account_status == "Inactive":
            return Response(
                {"detail": "Account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not verify_password(password, vendor_user.password_hash):
            vendor_user.failed_login_attempts = (vendor_user.failed_login_attempts or 0) + 1
            if vendor_user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                vendor_user.account_status = "Locked"
                vendor_user.account_locked_date = timezone.now()
            vendor_user.save()
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        vendor_user.failed_login_attempts = 0
        vendor_user.last_login_date = timezone.now()
        vendor_user.save()

        return Response({
            "message": "Login successful.",
            "user_id":             vendor_user.user_id,
            "registration_id":     vendor_reg.registration_id,
            "registration_no":     vendor_reg.registration_no,
            "vendor_name":         vendor_reg.vendor_name,
            "email":               vendor_user.email,
            "must_change_password": vendor_user.must_change_password,
            "registration_status": vendor_reg.registration_status,
        })


ALLOWED_EXTENSIONS = getattr(settings, "ALLOWED_UPLOAD_EXTENSIONS", {".pdf", ".png", ".jpg", ".jpeg"})
MAX_UPLOAD_SIZE    = getattr(settings, "MAX_UPLOAD_SIZE", 10 * 1024 * 1024)


class DocumentUploadView(APIView):
    def post(self, request):
        registration_id = request.data.get("registration_id")
        document_type   = request.data.get("document_type", "").strip()
        uploaded_file   = request.FILES.get("file")

        if not registration_id or not document_type or not uploaded_file:
            return Response(
                {"detail": "registration_id, document_type and file are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ext = Path(uploaded_file.name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {"detail": f"File type '{ext}' not allowed. Use PDF, PNG, JPG or JPEG."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if uploaded_file.size > MAX_UPLOAD_SIZE:
            return Response(
                {"detail": "File exceeds the 10 MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            vendor_reg = VendorRegistration.objects.get(pk=registration_id)
        except VendorRegistration.DoesNotExist:
            return Response({"detail": "Invalid registration_id."}, status=status.HTTP_404_NOT_FOUND)

        safe_type = "".join(c if c.isalnum() or c in (" ", "_", "-") else "_" for c in document_type)
        rel_dir   = Path(str(registration_id)) / safe_type
        abs_dir   = settings.MEDIA_ROOT / rel_dir
        abs_dir.mkdir(parents=True, exist_ok=True)

        unique_name = f"{uuid.uuid4().hex}{ext}"
        abs_path    = abs_dir / unique_name
        rel_path    = str(rel_dir / unique_name)

        with open(abs_path, "wb") as f:
            for chunk in uploaded_file.chunks():
                f.write(chunk)

        # Upsert: one record per (registration, document_type)
        existing = VendorDocument.objects.filter(
            registration=vendor_reg, document_type=document_type
        ).first()

        if existing:
            old_abs = settings.MEDIA_ROOT / existing.file_path
            if old_abs.exists():
                old_abs.unlink(missing_ok=True)
            # Clear stale extraction rows so the new AE workflow starts fresh
            VendorDocumentExtraction.objects.filter(document=existing).delete()
            existing.file_name   = uploaded_file.name
            existing.file_path   = rel_path
            existing.uploaded_by = request.data.get("uploaded_by")
            existing.status      = "Pending"
            existing.save()
            doc = existing
        else:
            doc = VendorDocument.objects.create(
                registration  = vendor_reg,
                document_type = document_type,
                file_name     = uploaded_file.name,
                file_path     = rel_path,
                uploaded_by   = request.data.get("uploaded_by"),
                status        = "Pending",
            )

        # Trigger AE T4 workflow if this document type has a mapped workflow
        ae_info = {}
        if document_type in DOCUMENT_WORKFLOW_MAP:
            doc_abs_path = str(abs_path.resolve())
            logger.info("Document '%s' saved at: %s — triggering AE workflow", document_type, doc_abs_path)
            try:
                ae_result = execute_document_workflow(document_type, doc_abs_path, doc.document_id)
                ae_info = {"triggered": True, "response": ae_result, "error": None}
                logger.info("AE workflow triggered for document %s (%s)", doc.document_id, document_type)
            except Exception as exc:
                ae_info = {"triggered": False, "response": None, "error": str(exc)}
                logger.error("AE workflow failed for document %s (%s): %s", doc.document_id, document_type, exc)

        response_data = DocumentSerializer(doc).data
        if ae_info:
            response_data["ae_workflow"] = ae_info

        return Response(response_data, status=status.HTTP_201_CREATED)


class DocumentListView(APIView):
    def get(self, request):
        registration_id = request.query_params.get("registration_id")
        if not registration_id:
            return Response({"detail": "registration_id query param is required."}, status=status.HTTP_400_BAD_REQUEST)

        docs = VendorDocument.objects.filter(registration_id=registration_id)
        response = Response(DocumentSerializer(docs, many=True).data)
        response['Cache-Control'] = 'no-store'
        return response


class DocumentDeleteView(APIView):
    def delete(self, request, document_id):
        try:
            doc = VendorDocument.objects.get(pk=document_id)
        except VendorDocument.DoesNotExist:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        abs_path = settings.MEDIA_ROOT / doc.file_path
        if abs_path.exists():
            abs_path.unlink(missing_ok=True)

        doc.delete()
        return Response({"detail": "Document deleted."}, status=status.HTTP_200_OK)


class DocumentDownloadView(APIView):
    def get(self, request, document_id):
        try:
            doc = VendorDocument.objects.get(pk=document_id)
        except VendorDocument.DoesNotExist:
            return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

        abs_path = settings.MEDIA_ROOT / doc.file_path
        if not abs_path.exists():
            return Response({"detail": "File not found on server."}, status=status.HTTP_404_NOT_FOUND)

        content_type, _ = mimetypes.guess_type(str(abs_path))
        response = FileResponse(
            open(abs_path, "rb"),
            content_type=content_type or "application/octet-stream",
        )
        response["Content-Disposition"] = f'inline; filename="{doc.file_name}"'
        return response


# Actions that trigger a vendor notification email
_NOTIFY_ACTIONS = frozenset({'Approved', 'Rejected', 'Sent Back'})

_NOTIFICATION_TYPE_MAP = {
    'Approved':  'APPROVAL_NOTIFICATION',
    'Rejected':  'REJECTION_NOTIFICATION',
    'Sent Back': 'SENT_BACK_NOTIFICATION',
}

_NOTIFICATION_SUBJECT_MAP = {
    'Approved':  "Congratulations! Your Vendor Registration {reg_no} has been Approved",
    'Rejected':  "Vendor Registration {reg_no} — Application Not Approved",
    'Sent Back': "Action Required: Vendor Registration {reg_no} Needs Corrections",
}


def _send_and_log_notification(reg: VendorRegistration, action: str, remarks: str) -> None:
    """
    Send a status email to the vendor and record it in tb_vendor_notifications.
    Always inserts a VendorNotification row even if the email send fails
    (delivery_status = 'Failed').
    """
    from .utils.email import send_vendor_status_email

    subject = _NOTIFICATION_SUBJECT_MAP.get(action, f"Vendor Registration {reg.registration_no} — Status Update").format(reg_no=reg.registration_no or '')
    notification_type = _NOTIFICATION_TYPE_MAP.get(action, action.upper().replace(' ', '_') + '_NOTIFICATION')
    delivery_status = 'Failed'

    try:
        send_vendor_status_email(
            to_email        = reg.email or '',
            vendor_name     = reg.vendor_name or reg.email or 'Vendor',
            registration_no = reg.registration_no or '',
            action          = action,
            remarks         = remarks,
        )
        delivery_status = 'Sent'
        logger.info("Notification email sent for reg %s action=%s", reg.registration_id, action)
    except Exception as exc:
        logger.error("Notification email failed for reg %s action=%s: %s", reg.registration_id, action, exc)

    VendorNotification.objects.create(
        registration      = reg,
        recipient_email   = reg.email or '',
        notification_type = notification_type,
        subject           = subject,
        delivery_status   = delivery_status,
    )


class VendorListView(APIView):
    """GET /api/finance/registrations/ — list all registrations for finance dashboard."""

    def get(self, request):
        from django.db.models import Count
        rows = (
            VendorRegistration.objects
            .select_related('profile')
            .annotate(document_count=Count('documents'))
            .order_by('-submitted_date', '-created_date')
        )
        result = []
        for r in rows:
            profile = getattr(r, 'profile', None)
            result.append({
                'registration_id':    r.registration_id,
                'registration_no':    r.registration_no or '',
                'registration_status': r.registration_status,
                'vendor_name':        r.vendor_name or '',
                'pan_number':         r.pan_number or '',
                'email':              r.email or '',
                'mobile':             r.mobile or '',
                'submitted_date':     r.submitted_date.strftime('%Y-%m-%d') if r.submitted_date else '',
                'created_date':       r.created_date.strftime('%Y-%m-%d') if r.created_date else '',
                'document_count':     r.document_count,
                'gstin':              profile.gstin if profile else '',
                'address':            profile.address if profile else '',
            })
        return Response(result)


class VendorDetailView(APIView):
    """GET /api/finance/registrations/<id>/ — full vendor detail for finance view."""

    def get(self, request, registration_id):
        try:
            reg = (
                VendorRegistration.objects
                .select_related('profile')
                .prefetch_related('bank_details', 'contact_details', 'documents')
                .get(pk=registration_id)
            )
        except VendorRegistration.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(reg, 'profile', None)
        bank    = reg.bank_details.filter(is_primary=True).first()
        contact = reg.contact_details.filter(is_primary=True).first()

        return Response({
            'registration_id':    reg.registration_id,
            'registration_no':    reg.registration_no or '',
            'registration_status': reg.registration_status,
            'vendor_name':        reg.vendor_name or '',
            'pan_number':         reg.pan_number or '',
            'email':              reg.email or '',
            'mobile':             reg.mobile or '',
            'submitted_date':     reg.submitted_date.strftime('%Y-%m-%d') if reg.submitted_date else '',
            'created_date':       reg.created_date.strftime('%Y-%m-%d') if reg.created_date else '',
            'gstin':              profile.gstin if profile else '',
            'address':            profile.address if profile else '',
            'goods_description':  profile.goods_service_description if profile else '',
            'bank_name':          bank.bank_name if bank else '',
            'bank_account_no':    bank.account_number if bank else '',
            'bank_ifsc':          bank.ifsc_code if bank else '',
            'bank_branch':        bank.branch_name if bank else '',
            'account_type':       bank.account_type if bank else '',
            'account_holder_name': bank.account_holder_name if bank else '',
            'contact_person':     contact.contact_person if contact else '',
            'designation':        contact.designation if contact else '',
            'documents': [
                {
                    'document_id':   doc.document_id,
                    'document_type': doc.document_type,
                    'file_name':     doc.file_name,
                    'status':        doc.status,
                }
                for doc in reg.documents.all()
            ],
        })


class VendorReviewView(APIView):
    """POST /api/finance/registrations/<id>/review/ — approve or reject a registration."""

    def post(self, request, registration_id):
        try:
            reg = VendorRegistration.objects.get(pk=registration_id)
        except VendorRegistration.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        action  = request.data.get('action', '').strip()
        remarks = request.data.get('remarks', '').strip()

        valid_actions = ('Draft', 'Submitted', 'Under Review', 'Sent Back', 'Resubmitted',
                         'Approved', 'Rejected', 'Tally Sync Pending', 'Completed')
        if action not in valid_actions:
            return Response(
                {'detail': f"action must be one of: {', '.join(valid_actions)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reg.registration_status = action
        if action == 'Approved':
            reg.approved_date = timezone.now()
        # Always store remarks (useful for Sent Back, optionally for others)
        reg.review_remarks = remarks if remarks else None
        reg.save()

        VendorApprovalHistory.objects.create(
            registration = reg,
            action       = action,
            comments     = remarks if remarks else None,
            action_by    = "Finance Admin",
        )

        # Send notification email for Approved / Rejected / Sent Back
        if action in _NOTIFY_ACTIONS:
            try:
                _send_and_log_notification(reg, action, remarks)
            except Exception as exc:
                logger.error("Notification logging failed for reg %s: %s", reg.registration_id, exc)

        return Response({
            'message': f'Registration {action}.',
            'registration_status': action,
            'remarks': remarks,
        })


# ── Date normalisation for OCR comparison ─────────────────────────────────────
# Converts any common date representation to ISO YYYY-MM-DD so that
# "Eighth day of July Nineteen Hundred Eighty Eight" == "08/07/1988" == "8 July 1988".

_ORD_WORDS: dict[str, str] = {
    'first':'1','second':'2','third':'3','fourth':'4','fifth':'5','sixth':'6',
    'seventh':'7','eighth':'8','ninth':'9','tenth':'10','eleventh':'11',
    'twelfth':'12','thirteenth':'13','fourteenth':'14','fifteenth':'15',
    'sixteenth':'16','seventeenth':'17','eighteenth':'18','nineteenth':'19',
    'twentieth':'20','twenty-first':'21','twenty-second':'22','twenty-third':'23',
    'twenty-fourth':'24','twenty-fifth':'25','twenty-sixth':'26',
    'twenty-seventh':'27','twenty-eighth':'28','twenty-ninth':'29',
    'thirtieth':'30','thirty-first':'31',
}

_UNIT_NUMS: dict[str, int] = {
    'zero':0,'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,
    'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,
    'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,'nineteen':19,
}
_TEN_NUMS: dict[str, int] = {
    'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,'seventy':70,'eighty':80,'ninety':90,
}

def _preprocess_date_words(val: str) -> str:
    """
    Convert English word-based dates to their numeric equivalents.
    'Eighth day of July Nineteen Hundred Eighty Eight' → '8 July 1988'
    """
    text = val.lower()
    text = re.sub(r'\bday\s+of\b', '', text)
    text = re.sub(r'\bthe\b', '', text)
    text = re.sub(r'(\d+)(st|nd|rd|th)\b', r'\1', text)  # strip ordinal suffixes
    for word, num in sorted(_ORD_WORDS.items(), key=lambda x: -len(x[0])):
        text = re.sub(r'\b' + re.escape(word) + r'\b', num, text)

    # Convert sequences of number-words into integers (handles years like "nineteen hundred eighty eight")
    tokens = text.split()
    result: list[str] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if tok in _UNIT_NUMS or tok in _TEN_NUMS:
            j, val_acc, cur = i, 0, 0
            while j < len(tokens) and (tokens[j] in _UNIT_NUMS or tokens[j] in _TEN_NUMS or tokens[j] in ('hundred', 'thousand', 'and')):
                t = tokens[j]
                if t == 'and':
                    j += 1; continue
                elif t == 'hundred':
                    cur = (cur or 1) * 100
                elif t == 'thousand':
                    val_acc += (cur or 1) * 1000; cur = 0
                elif t in _UNIT_NUMS:
                    cur += _UNIT_NUMS[t]
                else:
                    cur += _TEN_NUMS[t]
                j += 1
            val_acc += cur
            if val_acc > 0:
                result.append(str(val_acc)); i = j; continue
        result.append(tok); i += 1
    return ' '.join(result)


_DATE_FMTS = [
    '%d/%m/%Y','%d-%m-%Y','%d.%m.%Y',
    '%Y/%m/%d','%Y-%m-%d','%Y.%m.%d',
    '%d %B %Y','%d %b %Y','%B %d %Y','%b %d %Y',
    '%d %B, %Y','%d %b, %Y','%B %d, %Y','%b %d, %Y',
    '%d/%m/%y','%d-%m-%y',
    '%m/%d/%Y',  # US format last (lower priority)
]

def _try_parse_date(val: str) -> 'str | None':
    """Return ISO date string if val can be parsed as a date, else None."""
    if not val:
        return None
    processed = _preprocess_date_words(val)
    for text in (processed, val):
        for fmt in _DATE_FMTS:
            try:
                return datetime.datetime.strptime(text.strip(), fmt).strftime('%Y-%m-%d')
            except ValueError:
                pass
    # Last resort: try python-dateutil if available
    try:
        from dateutil import parser as du
        return du.parse(processed, dayfirst=True).strftime('%Y-%m-%d')
    except Exception:
        pass
    return None


def _norm_cmp(val: str) -> str:
    """Normalise a value for equality comparison: parse dates to ISO, else uppercase+strip."""
    parsed = _try_parse_date(val)
    return parsed if parsed else val.upper().strip()

# ──────────────────────────────────────────────────────────────────────────────

# Display label for each raw OCR field name
_FIELD_DISPLAY: dict[str, str] = {
    # PAN Card
    "vendorName":                  "Vendor Name",
    "pan":                         "PAN Number",
    "incorporationDate":           "Date of Incorporation",
    "dob":                         "Date of Birth",
    # Certificate of Incorporation
    "VendorName":                  "Vendor Name",
    "PAN":                         "PAN Number",
    "CIN":                         "CIN",
    "DateOfIncorporation":         "Date of Incorporation",
    # GST Certificate
    "GSTNo":                       "GSTIN",
    "PlaceOfBusiness":             "Place of Business",
    "AdditionalPlacesOfBusiness":  "Additional Places of Business",
    # Cancelled Cheque / Bank Statement
    "BankName":                    "Bank Name",
    "IFSCCode":                    "IFSC Code",
    "AccountNumber":               "Account Number",
    "BankAddress":                 "Bank Address",
    "BranchName":                  "Branch Name",
    "AccountType":                 "Account Type",
    # GST Certificate — place of business is same concept as vendor address
    "PlaceOfBusiness":             "Business Address",
    # MSME Certificate
    "DateOfRegistration":          "Date of Registration",
    "UdyamNo":                     "Udyam Number",
    "VendorAddress":               "Business Address",
    "AddressLine1":                "Address Line 1",
    "City":                        "City",
    "State":                       "State",
    "PIN":                         "PIN Code",
}

_FIELD_ORDER = [
    "Vendor Name", "PAN Number", "GSTIN",
    "Business Address",
    "Bank Name", "Branch Name", "Account Type", "IFSC Code", "Account Number", "Bank Address",
    "CIN", "Date of Incorporation", "Date of Birth",
    "Additional Places of Business",
    "Date of Registration", "Udyam Number",
    "Address Line 1", "City", "State", "PIN Code",
]

_KYC_DOC_ORDER = [
    "Certificate of Incorporation",
    "PAN Card",
    "GST Certificate",
    "Cancelled Cheque",
    "MSME Certificate",
    "Bank Statement",
]

# Maps extraction field_name (from tb_vendor_document_extraction) → form response key
EXTRACTION_TO_FORM: dict[str, str] = {
    # PAN Card
    "pan":           "pan",
    "vendorName":    "vendor_name",
    # Certificate of Incorporation
    "VendorName":    "vendor_name",
    "PAN":           "pan",
    # GST Certificate
    "GSTNo":         "gstin",
    # Cancelled Cheque / Bank Statement — shared field names
    "BankName":      "bank_name",
    "IFSCCode":      "ifsc",
    "AccountNumber": "account_number",
    "BankAddress":   "bank_address",
    # Bank Statement — additional fields
    "BranchName":    "bank_branch",
    "AccountType":   "account_type",
    # MSME Certificate — VendorName handled by global mapping above
    "AddressLine1":  "address_line1",
    "City":          "city",
    "State":         "state",
    "PIN":           "pincode",
}

# Per-document-type overrides: when the same field_name means something different
# depending on which document it was extracted from.
_EXTRACTION_DOC_OVERRIDES: dict[str, dict[str, str]] = {
    "Cancelled Cheque": {
        # Name printed on the cheque = account holder name, not the general vendor name
        "VendorName": "name_as_per_bank",
    },
    "Bank Statement": {
        # Name on the statement = account holder name
        "VendorName": "name_as_per_bank",
    },
}


# ── Cross-document comparison specs ───────────────────────────────────────────
# Each entry: (display_label, form_key_or_None, {doc_type: [extraction_field_names]})
# form_key maps to the key in RegistrationFormSerializer validated_data.
# doc_type keys must match VendorDocument.document_type values exactly.
_COMPARISON_SPECS: list[tuple[str, str | None, dict[str, list[str]]]] = [
    ("Vendor Name", "vendor_name", {
        "PAN Card":                     ["vendorName"],
        "Certificate of Incorporation": ["VendorName"],
        "GST Certificate":              ["VendorName"],
        "MSME Certificate":             ["VendorName"],
    }),
    ("PAN Number", "pan", {
        "PAN Card":                     ["pan"],
        "Certificate of Incorporation": ["PAN"],
    }),
    ("GSTIN", "gstin", {
        "GST Certificate": ["GSTNo"],
    }),
    ("Bank Name", "bank_name", {
        "Cancelled Cheque": ["BankName"],
        "Bank Statement":   ["BankName"],
    }),
    ("IFSC Code", "ifsc", {
        "Cancelled Cheque": ["IFSCCode"],
        "Bank Statement":   ["IFSCCode"],
    }),
    ("Account Number", "account_number", {
        "Cancelled Cheque": ["AccountNumber"],
        "Bank Statement":   ["AccountNumber"],
    }),
    ("Name as per Bank", "name_as_per_bank", {
        # VendorName from bank docs = account holder name (via _EXTRACTION_DOC_OVERRIDES)
        "Cancelled Cheque": ["VendorName"],
        "Bank Statement":   ["VendorName"],
    }),
    ("Bank Branch", "bank_branch", {
        "Cancelled Cheque": ["BranchName"],
        "Bank Statement":   ["BranchName"],
    }),
    ("Account Type", "account_type", {
        "Cancelled Cheque": ["AccountType"],
        "Bank Statement":   ["AccountType"],
    }),
    ("Date of Incorporation", None, {
        "PAN Card":                     ["incorporationDate"],
        "Certificate of Incorporation": ["DateOfIncorporation"],
        "MSME Certificate":             ["DateOfIncorporation"],
    }),
    ("City", "city", {
        "MSME Certificate": ["City"],
    }),
    ("State", "state", {
        "MSME Certificate": ["State"],
    }),
    ("PIN Code", "pincode", {
        "MSME Certificate": ["PIN"],
    }),
]

# Bank document priority: Cancelled Cheque value wins; Bank Statement is fallback.
_BANK_DOC_PRIORITY = ["Cancelled Cheque", "Bank Statement"]


def _field_similarity(a: str, b: str) -> float:
    """
    Normalised similarity (0.0–1.0) between two field values.
    Uses _norm_cmp so dates and case differences don't create false mismatches.
    """
    a_n = _norm_cmp(a)
    b_n = _norm_cmp(b)
    if a_n == b_n:
        return 1.0
    return SequenceMatcher(None, a_n, b_n).ratio()


def _save_comparison_results(vendor_reg: 'VendorRegistration', d: dict) -> None:
    """
    Compute and insert VendorComparisonResult rows for a form submission.
    Called once per submit/resubmit; always inserts new rows (history preserved).
    """
    # Build extraction lookup: (doc_type, field_name) → value
    docs = VendorDocument.objects.filter(registration_id=vendor_reg.registration_id)
    doc_id_to_type: dict[int, str] = {doc.document_id: doc.document_type for doc in docs}

    extraction_map: dict[tuple[str, str], str] = {}
    for row in VendorDocumentExtraction.objects.filter(document_id__in=list(doc_id_to_type.keys())):
        if row.field_value and row.field_value.lower() not in ('null', 'none', 'n/a', 'na'):
            extraction_map[(doc_id_to_type[row.document_id], row.field_name)] = row.field_value

    def _get(doc_type: str, field_names: list[str]) -> str | None:
        for fn in field_names:
            val = extraction_map.get((doc_type, fn))
            if val:
                return val
        return None

    def _get_bank(cheque_fields: list[str], statement_fields: list[str]) -> str | None:
        # Cancelled Cheque first, Bank Statement as fallback
        return (
            (_get("Cancelled Cheque", cheque_fields) if cheque_fields else None)
            or (_get("Bank Statement", statement_fields) if statement_fields else None)
        )

    # Form values from validated submitted data (ifsc uppercased to match extraction norm)
    form_data: dict[str, str] = {
        "vendor_name":      d.get("vendor_name", "") or "",
        "pan":              d.get("pan", "") or "",
        "gstin":            (d.get("gstin", "") or "").upper(),
        "bank_name":        d.get("bank_name", "") or "",
        "bank_branch":      d.get("bank_branch", "") or "",
        "account_type":     d.get("account_type", "") or "",
        "ifsc":             (d.get("ifsc", "") or "").upper(),
        "account_number":   d.get("account_number", "") or "",
        "name_as_per_bank": d.get("name_as_per_bank", "") or "",
        "city":             d.get("city", "") or "",
        "state":            d.get("state", "") or "",
        "pincode":          d.get("pincode", "") or "",
    }

    rows_to_create: list[VendorComparisonResult] = []

    for label, form_key, doc_spec in _COMPARISON_SPECS:
        pan_val  = _get("PAN Card",                     doc_spec.get("PAN Card", []))
        gst_val  = _get("GST Certificate",              doc_spec.get("GST Certificate", []))
        coi_val  = _get("Certificate of Incorporation", doc_spec.get("Certificate of Incorporation", []))
        msme_val = _get("MSME Certificate",             doc_spec.get("MSME Certificate", []))
        bank_val = _get_bank(
            doc_spec.get("Cancelled Cheque", []),
            doc_spec.get("Bank Statement", []),
        )
        form_val = (form_data.get(form_key) or None) if form_key else None

        # Only save rows where at least 2 sources have data (meaningful comparison)
        all_vals = [v for v in [pan_val, gst_val, bank_val, coi_val, msme_val, form_val] if v]
        if len(all_vals) < 2:
            continue

        # Compute pairwise minimum similarity as the confidence score
        unique_vals = list(dict.fromkeys(all_vals))  # deduplicate preserving order
        if len(unique_vals) == 1:
            result         = "Match"
            confidence     = 100.00
            remarks        = None
        else:
            min_sim = 1.0
            for i in range(len(all_vals)):
                for j in range(i + 1, len(all_vals)):
                    min_sim = min(min_sim, _field_similarity(all_vals[i], all_vals[j]))

            confidence = round(min_sim * 100, 2)

            if min_sim == 1.0:
                result  = "Match"
                remarks = None
            elif min_sim >= 0.70:
                result  = "Partial Match"
                remarks = "Values are similar but not identical across sources"
            else:
                result  = "Mismatch"
                remarks = "Values differ significantly across sources"

        rows_to_create.append(VendorComparisonResult(
            registration        = vendor_reg,
            field_name          = label,
            pan_document_value  = pan_val,
            gst_document_value  = gst_val,
            bank_document_value = bank_val,
            coi_document_value  = coi_val,
            msme_document_value = msme_val,
            form_value          = form_val,
            comparison_result   = result,
            confidence_score    = confidence,
            remarks             = remarks,
        ))

    if rows_to_create:
        VendorComparisonResult.objects.bulk_create(rows_to_create)


def _parse_address(full_address: str) -> dict:
    """
    Reverse of the address build logic:
      "line1[, line2], city, state - pincode"
    Returns keys: address_line1, address_line2, city, state, pincode.
    """
    pincode = city = state = address_line1 = address_line2 = ""
    if not full_address:
        return dict(address_line1="", address_line2="", city="", state="", pincode="")

    # Split off pincode after last " - "
    if " - " in full_address:
        addr_part, pincode = full_address.rsplit(" - ", 1)
        pincode = pincode.strip()
    else:
        addr_part = full_address

    parts = [p.strip() for p in addr_part.split(", ")]

    if len(parts) >= 3:
        state         = parts[-1]
        city          = parts[-2]
        address_line1 = parts[0]
        address_line2 = ", ".join(parts[1:-2]) if len(parts) > 3 else ""
    elif len(parts) == 2:
        state         = parts[-1]
        address_line1 = parts[0]
    else:
        address_line1 = addr_part

    return dict(
        address_line1=address_line1,
        address_line2=address_line2,
        city=city,
        state=state,
        pincode=pincode,
    )


def _build_extracted_fields(registration_id: int, uploaded_after=None) -> dict:
    """
    Fetch all extraction rows for every document in this registration,
    apply EXTRACTION_TO_FORM mapping, and return { form_field: value }.
    Per-document overrides (_EXTRACTION_DOC_OVERRIDES) take priority over the
    global mapping so the same field_name can resolve differently by document type.

    If uploaded_after is given, only consider documents uploaded after that datetime
    (used to identify "fresh" extractions from re-uploaded documents).
    """
    docs_qs = VendorDocument.objects.filter(registration_id=registration_id)
    if uploaded_after is not None:
        docs_qs = docs_qs.filter(uploaded_date__gt=uploaded_after)
    docs = list(docs_qs)
    if not docs:
        return {}
    doc_id_to_type = {d.document_id: d.document_type for d in docs}

    rows = VendorDocumentExtraction.objects.filter(document_id__in=list(doc_id_to_type.keys()))

    def _doc_priority(row: VendorDocumentExtraction) -> int:
        doc_type = doc_id_to_type.get(row.document_id, '')
        try:
            return _KYC_DOC_ORDER.index(doc_type)
        except ValueError:
            return len(_KYC_DOC_ORDER)

    result: dict[str, str] = {}
    # Sort by document order so Bank Statement (last) overwrites Cancelled Cheque values
    for row in sorted(rows, key=_doc_priority):
        doc_type = doc_id_to_type[row.document_id]
        form_key = (
            _EXTRACTION_DOC_OVERRIDES.get(doc_type, {}).get(row.field_name)
            or EXTRACTION_TO_FORM.get(row.field_name)
        )
        if form_key and row.field_value and row.field_value.lower() not in ('null', 'none', 'n/a', 'na'):
            result[form_key] = row.field_value

    return result


class RegistrationFormView(APIView):
    """
    GET  /api/registration/form-data?registration_id=X  → load saved form data
    POST /api/registration/submit-form                  → save form, status → Submitted
    """

    def get(self, request):
        registration_id = request.query_params.get("registration_id")
        if not registration_id:
            return Response({"detail": "registration_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            vendor_reg = VendorRegistration.objects.get(pk=registration_id)
        except VendorRegistration.DoesNotExist:
            return Response({"detail": "Invalid registration_id."}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(vendor_reg, "profile", None)
        gst     = vendor_reg.gst_details.filter(is_primary=True).first()
        bank    = vendor_reg.bank_details.filter(is_primary=True).first()
        contact = vendor_reg.contact_details.filter(is_primary=True).first()

        response = Response({
            "registration_id":        vendor_reg.registration_id,
            "registration_status":    vendor_reg.registration_status,
            "review_remarks":         vendor_reg.review_remarks or "",
            "vendor_name":            vendor_reg.vendor_name or "",
            "email":                  vendor_reg.email or "",
            "phone":                  vendor_reg.mobile or "",
            "pan":                    vendor_reg.pan_number or "",
            "gstin":                  profile.gstin if profile else "",
            "goods_description":      profile.goods_service_description if profile else "",
            **_parse_address(profile.address if profile else ""),
            "state":                  gst.state_name if gst else "",
            "bank_name":              bank.bank_name if bank else "",
            "bank_branch":            bank.branch_name if bank else "",
            "account_type":           bank.account_type if bank else "",
            "ifsc":                   bank.ifsc_code if bank else "",
            "account_number":         bank.account_number if bank else "",
            "name_as_per_bank":       bank.account_holder_name if bank else "",
            "contact_person_ae":      contact.contact_person if contact else "",
            "extracted_fields":       _build_extracted_fields(vendor_reg.registration_id),
            # Only extractions from documents re-uploaded after the last submission.
            # Frontend uses these to override saved values when the form is sent back.
            "fresh_extracted_fields": _build_extracted_fields(
                vendor_reg.registration_id,
                uploaded_after=vendor_reg.submitted_date,
            ),
        })
        response['Cache-Control'] = 'no-store'
        return response

    def post(self, request):
        serializer = RegistrationFormSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data

        try:
            vendor_reg = VendorRegistration.objects.get(pk=d["registration_id"])
        except VendorRegistration.DoesNotExist:
            return Response({"detail": "Invalid registration_id."}, status=status.HTTP_404_NOT_FOUND)

        # Capture previous DB values BEFORE any updates so the change log can
        # compare new submission against what the vendor previously saved.
        is_resubmission = vendor_reg.registration_status == "Sent Back"
        if is_resubmission:
            _prev_bank = vendor_reg.bank_details.filter(is_primary=True).first()
            _prev_profile = getattr(vendor_reg, "profile", None)
            _prev_addr = _parse_address(_prev_profile.address if _prev_profile else "")
            _prev_db: dict[str, str] = {
                "vendor_name":      vendor_reg.vendor_name or "",
                "pan":              vendor_reg.pan_number or "",
                "gstin":            (_prev_profile.gstin if _prev_profile else "") or "",
                "bank_name":        (_prev_bank.bank_name if _prev_bank else "") or "",
                "bank_branch":      (_prev_bank.branch_name if _prev_bank else "") or "",
                "account_type":     (_prev_bank.account_type if _prev_bank else "") or "",
                "ifsc":             ((_prev_bank.ifsc_code if _prev_bank else "") or "").upper(),
                "account_number":   (_prev_bank.account_number if _prev_bank else "") or "",
                "name_as_per_bank": (_prev_bank.account_holder_name if _prev_bank else "") or "",
                "address_line1":    _prev_addr.get("address_line1", ""),
                "city":             _prev_addr.get("city", ""),
                "state":            _prev_addr.get("state", ""),
                "pincode":          _prev_addr.get("pincode", ""),
            }
        else:
            _prev_db = {}

        # 1. Update core registration fields
        vendor_reg.vendor_name    = d["vendor_name"]
        vendor_reg.email          = d["email"]
        vendor_reg.mobile         = d["phone"]
        # Sent Back → Resubmitted; first-time submit → Submitted
        vendor_reg.registration_status = (
            "Resubmitted" if vendor_reg.registration_status == "Sent Back" else "Submitted"
        )
        vendor_reg.submitted_date = timezone.now()
        vendor_reg.review_remarks = None   # clear remarks on resubmit
        vendor_reg.save()

        # 2. Build combined address string
        parts = [d["address_line1"]]
        if d.get("address_line2"):
            parts.append(d["address_line2"])
        parts.extend([d["city"], d["state"]])
        full_address = ", ".join(parts) + " - " + d["pincode"]

        # 3. Upsert VendorProfile (one-to-one)
        VendorProfile.objects.update_or_create(
            registration=vendor_reg,
            defaults={
                "address":                   full_address,
                "goods_service_description": d["goods_description"],
                "gstin":                     d["gstin"].upper(),
            },
        )

        # 4. Upsert primary VendorGST record
        gstin      = d["gstin"].upper()
        state_code = gstin[:2] if len(gstin) >= 2 else None
        existing_gst = vendor_reg.gst_details.filter(is_primary=True).first()
        if existing_gst:
            existing_gst.gst_number         = gstin
            existing_gst.state_code         = state_code
            existing_gst.state_name         = d["state"]
            existing_gst.registered_address = full_address
            existing_gst.save()
        else:
            VendorGST.objects.create(
                registration       = vendor_reg,
                gst_number         = gstin,
                state_code         = state_code,
                state_name         = d["state"],
                registered_address = full_address,
                is_primary         = True,
                status             = "Active",
            )

        # 5. Replace primary bank record (delete + re-create to avoid unique conflicts)
        vendor_reg.bank_details.filter(is_primary=True).delete()
        VendorBankDetails.objects.create(
            registration        = vendor_reg,
            bank_name           = d["bank_name"],
            account_holder_name = d["name_as_per_bank"],
            account_number      = d["account_number"],
            ifsc_code           = d["ifsc"].upper(),
            branch_name         = d["bank_branch"],
            account_type        = d["account_type"],
            is_primary          = True,
            status              = "Active",
        )

        # 6. Replace primary contact record
        vendor_reg.contact_details.filter(is_primary=True).delete()
        VendorContactDetails.objects.create(
            registration   = vendor_reg,
            contact_person = d["contact_person_ae"],
            designation    = "AE Internal Sponsor",
            is_primary     = True,
        )

        # 7. Log all fields where the vendor changed a value from the baseline.
        #    First submission  → baseline is the OCR-extracted value.
        #    Resubmission      → baseline is the previously saved DB value;
        #                        fall back to OCR if no DB value existed for that field.
        _LOG_FIELDS: dict[str, str] = {
            "vendor_name":      "Vendor Name",
            "pan":              "PAN Number",
            "gstin":            "GSTIN",
            "bank_name":        "Bank Name",
            "bank_branch":      "Bank Branch",
            "account_type":     "Account Type",
            "ifsc":             "IFSC Code",
            "account_number":   "Account Number",
            "name_as_per_bank": "Name as per Bank",
            "address_line1":    "Address Line 1",
            "city":             "City",
            "state":            "State",
            "pincode":          "PIN Code",
        }
        _submitted_values: dict[str, str] = {
            "vendor_name":      d.get("vendor_name", "") or "",
            "pan":              d.get("pan", "") or "",
            "gstin":            d.get("gstin", "") or "",
            "bank_name":        d.get("bank_name", "") or "",
            "bank_branch":      d.get("bank_branch", "") or "",
            "account_type":     d.get("account_type", "") or "",
            "ifsc":             (d.get("ifsc", "") or "").upper(),
            "account_number":   d.get("account_number", "") or "",
            "name_as_per_bank": d.get("name_as_per_bank", "") or "",
            "address_line1":    d.get("address_line1", "") or "",
            "city":             d.get("city", "") or "",
            "state":            d.get("state", "") or "",
            "pincode":          d.get("pincode", "") or "",
        }
        extracted = _build_extracted_fields(vendor_reg.registration_id)
        change_logs = []
        for form_key, display_name in _LOG_FIELDS.items():
            ocr_val = (extracted.get(form_key) or "").strip()
            sub_val = _submitted_values.get(form_key, "").strip()
            if not sub_val:
                continue

            if is_resubmission:
                # Use previous saved DB value as the original; fall back to OCR
                prev_val = (_prev_db.get(form_key) or "").strip()
                original = prev_val or ocr_val
            else:
                # First submission: compare against OCR extracted value only
                original = ocr_val

            if original and original.upper() != sub_val.upper():
                change_logs.append(VendorFieldChangeLog(
                    registration   = vendor_reg,
                    field_name     = display_name,
                    original_value = original,
                    modified_value = sub_val,
                    changed_by     = vendor_reg.email or "",
                ))
        if change_logs:
            VendorFieldChangeLog.objects.bulk_create(change_logs)

        # 8. Compute and store cross-document + form comparison results
        try:
            _save_comparison_results(vendor_reg, d)
        except Exception as exc:
            logger.error("Comparison result save failed for reg %s: %s", vendor_reg.registration_id, exc)

        # 9. Record vendor action in approval history
        VendorApprovalHistory.objects.create(
            registration = vendor_reg,
            action       = vendor_reg.registration_status,   # "Submitted" or "Resubmitted"
            comments     = None,
            action_by    = vendor_reg.email or "Vendor",
        )

        return Response(
            {"message": "Registration form submitted successfully.", "registration_status": "Submitted"},
            status=status.HTTP_200_OK,
        )


# ── Document extraction results ───────────────────────────────────────────────
class DocumentExtractionView(APIView):
    """
    GET /api/documents/<document_id>/extraction/
    Returns all extracted fields for a document as { field_name: field_value } dict.
    Written by AE T4 workflow; read here to pre-fill forms.
    """
    def get(self, request, document_id: int):
        rows = VendorDocumentExtraction.objects.filter(document_id=document_id)
        data = {r.field_name: r.field_value for r in rows}
        return Response({"document_id": document_id, "fields": data})


# ── OCR Extraction Comparison Analysis ────────────────────────────────────────
class ExtractionAnalysisView(APIView):
    """
    GET /api/finance/registrations/<registration_id>/extraction-analysis/
    Returns all OCR-extracted fields grouped by display label, with values
    from each document type, plus a match/conflict indicator per field.
    """
    def get(self, request, registration_id: int):
        from collections import defaultdict

        docs = list(VendorDocument.objects.filter(registration_id=registration_id))
        if not docs:
            response = Response({"document_types": [], "fields": []})
            response['Cache-Control'] = 'no-store'
            return response

        doc_by_id = {d.document_id: d for d in docs}
        rows = VendorDocumentExtraction.objects.filter(document_id__in=list(doc_by_id.keys()))

        # { display_label: { doc_type: value } }
        field_data: dict[str, dict[str, str]] = defaultdict(dict)
        for row in rows:
            if not row.field_value or row.field_value.lower() in ('null', 'none', 'n/a', 'na'):
                continue
            label    = _FIELD_DISPLAY.get(row.field_name, row.field_name)
            doc_type = doc_by_id[row.document_id].document_type
            field_data[label][doc_type] = row.field_value

        # Only include doc types that produced at least one extraction
        active_doc_types = sorted(
            {dt for vals in field_data.values() for dt in vals},
            key=lambda dt: _KYC_DOC_ORDER.index(dt) if dt in _KYC_DOC_ORDER else 99,
        )

        def _sort_key(label: str) -> int:
            try:
                return _FIELD_ORDER.index(label)
            except ValueError:
                return len(_FIELD_ORDER)

        fields = []
        for label in sorted(field_data.keys(), key=_sort_key):
            values = field_data[label]
            present      = [_norm_cmp(v) for v in values.values() if v]
            all_match    = len(set(present)) <= 1
            has_conflict = len(present) > 1 and not all_match
            fields.append({
                "label":        label,
                "values":       values,
                "all_match":    all_match,
                "has_conflict": has_conflict,
            })

        response = Response({"document_types": active_doc_types, "fields": fields})
        response['Cache-Control'] = 'no-store'
        return response


# ── Form vs OCR Comparison ─────────────────────────────────────────────────────
class FormAnalysisView(APIView):
    """
    GET /api/finance/registrations/<registration_id>/form-analysis/
    Compares vendor-submitted form values with OCR-extracted values field by field.
    Returns match / mismatch / missing for each comparable field.
    """

    _FIELDS = [
        # (form_key,          display_label,    mono)
        ("vendor_name",       "Vendor Name",    False),
        ("pan",               "PAN Number",     True),
        ("gstin",             "GSTIN",          True),
        ("bank_name",         "Bank Name",      False),
        ("bank_branch",       "Bank Branch",    False),
        ("account_type",      "Account Type",   False),
        ("ifsc",              "IFSC Code",      True),
        ("account_number",    "Account Number", True),
        ("name_as_per_bank",  "Name as per Bank", False),
        ("address_line1",     "Address Line 1", False),
        ("city",              "City",           False),
        ("state",             "State",          False),
        ("pincode",           "PIN Code",       True),
    ]

    def get(self, request, registration_id: int):
        try:
            vendor_reg = VendorRegistration.objects.get(pk=registration_id)
        except VendorRegistration.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(vendor_reg, "profile", None)
        bank    = vendor_reg.bank_details.filter(is_primary=True).first()
        parsed  = _parse_address(profile.address if profile else "")

        submitted = {
            "vendor_name":      vendor_reg.vendor_name or "",
            "pan":              vendor_reg.pan_number or "",
            "gstin":            profile.gstin if profile else "",
            "bank_name":        bank.bank_name if bank else "",
            "bank_branch":      bank.branch_name if bank else "",
            "account_type":     bank.account_type if bank else "",
            "ifsc":             bank.ifsc_code if bank else "",
            "account_number":   bank.account_number if bank else "",
            "name_as_per_bank": bank.account_holder_name if bank else "",
            "address_line1":    parsed["address_line1"],
            "city":             parsed["city"],
            "state":            parsed["state"],
            "pincode":          parsed["pincode"],
        }

        extracted = _build_extracted_fields(registration_id)

        fields = []
        for form_key, label, mono in self._FIELDS:
            sub = submitted.get(form_key, "").strip()
            ext = extracted.get(form_key, "").strip()
            if not sub and not ext:
                continue
            if sub and ext:
                match = _norm_cmp(sub) == _norm_cmp(ext)
            else:
                match = None  # one side missing — no OCR or not yet submitted
            fields.append({"label": label, "submitted": sub, "extracted": ext, "match": match, "mono": mono})

        response = Response({"fields": fields})
        response['Cache-Control'] = 'no-store'
        return response


# ── AE T4 Workflow Status ──────────────────────────────────────────────────────
class AEWorkflowStatusView(APIView):
    """
    GET /api/ae/workflow-status/<request_id>/
    Returns current status of a single workflow execution.
    Frontend polls this until complete/failed or timeout.
    """
    def get(self, request, request_id: int):
        try:
            wf_status = get_workflow_status(request_id)
            return Response({
                "automation_request_id": request_id,
                "status":   wf_status,
                "complete": wf_status == "Complete",
                "failed":   wf_status in ("Failure", "Failed", "Error"),
            })
        except RuntimeError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ── AE T4 Auth Test ────────────────────────────────────────────────────────────
class AEAuthTestView(APIView):
    """
    GET /api/ae/auth-test/
    Verifies AE T4 credentials by fetching a session token.
    Returns a masked token (first 8 chars) so the full token is never exposed.
    Remove or protect this endpoint before going to production.
    """
    def get(self, request):
        try:
            token = get_ae_token(force_refresh=True)
            return Response({
                "status":  "ok",
                "message": "AE T4 authentication successful.",
                "token_preview": token[:8] + "…" if token else "",
            })
        except RuntimeError as exc:
            return Response({"status": "error", "message": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
