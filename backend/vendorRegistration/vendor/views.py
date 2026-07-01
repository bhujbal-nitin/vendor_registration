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

from .models import VendorRegistration, VendorUser, VendorDocument, VendorProfile, VendorGST, VendorBankDetails, VendorDocumentExtraction, VendorFieldChangeLog, VendorComparisonResult, VendorApprovalHistory, VendorNotification, TallySyncLog, VendorMaster
from .serializers import (
    RegisterRequestSerializer, LoginRequestSerializer, DocumentSerializer,
    RegistrationFormSerializer, VendorProfileSerializer, VendorGSTSerializer,
    VendorBankDetailsSerializer,
)
from .utils.password import generate_password, hash_password, verify_password
from .ae_service import get_ae_token, execute_document_workflow, DOCUMENT_WORKFLOW_MAP, get_workflow_status
from . import tally_service

import logging
logger = logging.getLogger(__name__)
from .utils.registration import generate_registration_no, generate_vendor_code
from .utils.email import send_password_email

MAX_FAILED_ATTEMPTS = 5


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pan_number = serializer.validated_data["pan_number"].upper()
        email      = serializer.validated_data["email"].lower()

        if VendorUser.objects.filter(pan_number=pan_number).exists():
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

        # VendorUser is created first, then VendorRegistration links to it
        plain_password = generate_password()
        vendor_user = VendorUser.objects.create(
            pan_number=pan_number,
            email=email,
            password_hash=hash_password(plain_password),
            account_status="Active",
            must_change_password="Y",
        )

        VendorRegistration.objects.create(
            registration_no=registration_no,
            user=vendor_user,
            registration_status="DRAFT",
            current_stage="ACCOUNT_CREATION",
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
            vendor_user = VendorUser.objects.get(pan_number=pan_number)
        except VendorUser.DoesNotExist:
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if vendor_user.account_status == "Locked":
            return Response(
                {"detail": "Account locked. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if vendor_user.account_status == "Inactive":
            return Response(
                {"detail": "Account is inactive. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not verify_password(password, vendor_user.password_hash):
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        vendor_user.last_login_date = timezone.now()
        vendor_user.save()

        vendor_reg = vendor_user.registrations.order_by("-created_date").first()

        return Response({
            "message": "Login successful.",
            "user_id":              vendor_user.user_id,
            "registration_id":      vendor_reg.registration_id if vendor_reg else None,
            "registration_no":      vendor_reg.registration_no if vendor_reg else None,
            "pan_number":           vendor_user.pan_number,
            "email":                vendor_user.email,
            "must_change_password": vendor_user.must_change_password,
            "registration_status":  vendor_reg.registration_status if vendor_reg else None,
            "current_stage":        vendor_reg.current_stage if vendor_reg else None,
        })


class ChangePasswordView(APIView):
    def post(self, request):
        pan_number       = (request.data.get("pan_number") or "").strip().upper()
        current_password = (request.data.get("current_password") or "").strip()
        new_password     = (request.data.get("new_password") or "").strip()

        if not pan_number or not current_password or not new_password:
            return Response(
                {"detail": "pan_number, current_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {"detail": "New password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            vendor_user = VendorUser.objects.get(pan_number=pan_number)
        except VendorUser.DoesNotExist:
            return Response(
                {"detail": "Invalid PAN number or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not verify_password(current_password, vendor_user.password_hash):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        vendor_user.password_hash        = hash_password(new_password)
        vendor_user.must_change_password = "N"
        vendor_user.save()

        return Response({"message": "Password changed successfully."})


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

        uploaded_by_val = str(request.data.get("uploaded_by") or "")

        if existing:
            old_abs = settings.MEDIA_ROOT / existing.file_path
            if old_abs.exists():
                old_abs.unlink(missing_ok=True)
            VendorDocumentExtraction.objects.filter(document=existing).delete()
            existing.file_name   = uploaded_file.name
            existing.file_path   = rel_path
            existing.file_size   = uploaded_file.size
            existing.uploaded_by = uploaded_by_val
            existing.save()
            doc = existing
        else:
            doc = VendorDocument.objects.create(
                registration  = vendor_reg,
                document_type = document_type,
                file_name     = uploaded_file.name,
                file_path     = rel_path,
                file_size     = uploaded_file.size,
                uploaded_by   = uploaded_by_val,
            )

        # Advance registration status/stage on first document upload
        if vendor_reg.registration_status == "DRAFT":
            vendor_reg.registration_status = "DOCUMENT_UPLOADED"
            vendor_reg.current_stage       = "DOCUMENT_UPLOAD"
            vendor_reg.save(update_fields=["registration_status", "current_stage", "updated_date"])

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
_NOTIFY_ACTIONS = frozenset({'APPROVED', 'REJECTED', 'SEND_BACK'})

_NOTIFICATION_TYPE_MAP = {
    'APPROVED':  'APPROVAL_NOTIFICATION',
    'REJECTED':  'REJECTION_NOTIFICATION',
    'SEND_BACK': 'SENT_BACK_NOTIFICATION',
}

_NOTIFICATION_SUBJECT_MAP = {
    'APPROVED':  "Congratulations! Your Vendor Registration {reg_no} has been Approved",
    'REJECTED':  "Vendor Registration {reg_no} — Application Not Approved",
    'SEND_BACK': "Action Required: Vendor Registration {reg_no} Needs Corrections",
}

# Stage to set automatically for each finance action
_ACTION_STAGE_MAP = {
    'DRAFT':          'ACCOUNT_CREATION',
    'DOCUMENT_UPLOADED': 'DOCUMENT_UPLOAD',
    'SUBMITTED':      'FINANCE_REVIEW',
    'UNDER_REVIEW':   'FINANCE_REVIEW',
    'SEND_BACK':      'FORM_COMPLETION',
    'RESUBMITTED':    'FINANCE_REVIEW',
    'APPROVED':       'TALLY_SYNC',
    'REJECTED':       'COMPLETED',
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
        vendor_email = reg.user.email if reg.user_id else ''
        profile      = reg.profiles.first()
        vendor_name  = (profile.vendor_name if profile else None) or vendor_email or 'Vendor'
        send_vendor_status_email(
            to_email        = vendor_email,
            vendor_name     = vendor_name,
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
        recipient_email   = reg.user.email if reg.user_id else '',
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
            .select_related('user')
            .prefetch_related('profiles', 'gst_details')
            .annotate(document_count=Count('documents'))
            .order_by('-submitted_date', '-created_date')
        )
        result = []
        for r in rows:
            profile = r.profiles.first()
            gst     = r.gst_details.first()
            result.append({
                'registration_id':    r.registration_id,
                'registration_no':    r.registration_no or '',
                'registration_status': r.registration_status,
                'vendor_name':        (profile.vendor_name if profile else '') or '',
                'pan_number':         (r.user.pan_number if r.user_id else '') or '',
                'email':              (r.user.email if r.user_id else '') or '',
                'mobile':             (profile.mobile if profile else '') or '',
                'submitted_date':     r.submitted_date.strftime('%Y-%m-%d') if r.submitted_date else '',
                'created_date':       r.created_date.strftime('%Y-%m-%d') if r.created_date else '',
                'document_count':     r.document_count,
                'gstin':              (gst.gstin if gst else '') or '',
                'address':            (profile.address if profile else '') or '',
            })
        return Response(result)


class VendorDetailView(APIView):
    """GET /api/finance/registrations/<id>/ — full vendor detail for finance view."""

    def get(self, request, registration_id):
        try:
            reg = (
                VendorRegistration.objects
                .select_related('user')
                .prefetch_related('profiles', 'gst_details', 'bank_details', 'documents')
                .get(pk=registration_id)
            )
        except VendorRegistration.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile = reg.profiles.first()
        gst     = reg.gst_details.first()
        bank    = reg.bank_details.first()

        return Response({
            'registration_id':    reg.registration_id,
            'registration_no':    reg.registration_no or '',
            'registration_status': reg.registration_status,
            'vendor_name':        (profile.vendor_name if profile else '') or '',
            'pan_number':         (reg.user.pan_number if reg.user_id else '') or '',
            'email':              (reg.user.email if reg.user_id else '') or '',
            'mobile':             (profile.mobile if profile else '') or '',
            'submitted_date':     reg.submitted_date.strftime('%Y-%m-%d') if reg.submitted_date else '',
            'created_date':       reg.created_date.strftime('%Y-%m-%d') if reg.created_date else '',
            'gstin':              (gst.gstin if gst else '') or '',
            'address':            (profile.address if profile else '') or '',
            'goods_description':  (profile.goods_service_description if profile else '') or '',
            'bank_name':          (bank.bank_name if bank else '') or '',
            'bank_account_no':    (bank.account_number if bank else '') or '',
            'bank_ifsc':          (bank.ifsc_code if bank else '') or '',
            'bank_branch':        (bank.branch_name if bank else '') or '',
            'account_type':       (bank.account_type if bank else '') or '',
            'account_holder_name': (bank.account_holder_name if bank else '') or '',
            'contact_person':     (profile.contact_person if profile else '') or '',
            'designation':        '',
            'documents': [
                {
                    'document_id':   doc.document_id,
                    'document_type': doc.document_type,
                    'file_name':     doc.file_name,
                    'status':        'Uploaded',
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

        valid_actions = (
            'DRAFT', 'DOCUMENT_UPLOADED', 'SUBMITTED', 'UNDER_REVIEW',
            'SEND_BACK', 'RESUBMITTED', 'APPROVED', 'REJECTED',
        )
        if action not in valid_actions:
            return Response(
                {'detail': f"action must be one of: {', '.join(valid_actions)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Approval must succeed in Tally before the status is allowed to change.
        # If the Tally sync fails, the registration stays in its current status
        # and the error is returned to the finance admin to act on.
        if action == 'APPROVED':
            profile = reg.profiles.first()
            gst     = reg.gst_details.first()
            bank    = reg.bank_details.first()
            address = (profile.address if profile else "") or ""
            pincode = _parse_address(address).get("pincode", "")

            vendor_payload = {
                "name":                (profile.vendor_name if profile else "") or "",
                "pan":                 (reg.user.pan_number if reg.user_id else "") or "",
                "address":             address,
                "state":               (gst.state_name if gst else "") or "",
                "pincode":             pincode,
                "gstin":               (gst.gstin if gst else "") or "",
                "bank_name":           (bank.bank_name if bank else "") or "",
                "ifsc_code":           (bank.ifsc_code if bank else "") or "",
                "account_number":      (bank.account_number if bank else "") or "",
                "account_holder_name": (bank.account_holder_name if bank else "") or "",
            }

            # If this registration was approved before, re-approval must update/
            # rename the SAME Tally ledger (ACTION=Alter) instead of creating a
            # second, orphaned one. The lookup name is whatever Tally currently
            # has the ledger filed under (the last name we successfully synced).
            existing_master = VendorMaster.objects.filter(registration=reg).first()
            existing_ledger_name = existing_master.vendor_name if existing_master else None

            result = tally_service.create_vendor_ledger(vendor_payload, existing_name=existing_ledger_name)

            TallySyncLog.objects.create(
                registration      = reg,
                request_payload   = result["request_payload"],
                response_payload  = result["response_payload"],
                sync_status        = "Synced" if result["success"] else "Failed",
            )

            if not result["success"]:
                logger.error("Tally sync failed for reg %s: %s", reg.registration_id, result["message"])
                return Response(
                    {"detail": f"Approval blocked — could not create vendor in Tally: {result['message']}"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Best-effort: look up the ledger's internal MASTERID from Tally.
            # Never blocks approval — the ledger was already saved successfully.
            lookup = tally_service.fetch_ledger_master_id(vendor_payload["name"])
            if not lookup["success"]:
                logger.warning(
                    "Could not fetch Tally MASTERID for reg %s: %s",
                    reg.registration_id, lookup["message"],
                )

            # Tally ledger saved successfully — now add/refresh this vendor in
            # tb_vendor_master. One row per registration: reuse the existing
            # vendor_code on re-approval, only generate a new one the first time.
            vendor_code = existing_master.vendor_code if existing_master else generate_vendor_code()
            VendorMaster.objects.update_or_create(
                registration=reg,
                defaults={
                    "vendor_code":       vendor_code,
                    "vendor_name":       vendor_payload["name"],
                    "pan_number":        vendor_payload["pan"],
                    "gstin":             vendor_payload["gstin"],
                    "address":           vendor_payload["address"],
                    "status":            "Active",
                    "tally_ledger_code": lookup["master_id"],
                },
            )

        reg.registration_status = action
        reg.current_stage       = _ACTION_STAGE_MAP.get(action, reg.current_stage)
        if action == 'APPROVED':
            reg.approved_date = timezone.now()
        reg.rejection_reason = remarks if remarks else None
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
    'twentieth':'20',
    # hyphenated forms (e.g. "twenty-fourth")
    'twenty-first':'21','twenty-second':'22','twenty-third':'23',
    'twenty-fourth':'24','twenty-fifth':'25','twenty-sixth':'26',
    'twenty-seventh':'27','twenty-eighth':'28','twenty-ninth':'29',
    # unhyphenated forms as OCR often outputs (e.g. "TWENTYFOURTH")
    'twentyfirst':'21','twentysecond':'22','twentythird':'23',
    'twentyfourth':'24','twentyfifth':'25','twentysixth':'26',
    'twentyseventh':'27','twentyeighth':'28','twentyninth':'29',
    'thirtieth':'30','thirty-first':'31','thirtyfirst':'31',
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
        form_val = (form_data.get(form_key) or None) if form_key else None

        # One row per (field_name, document_type) — new documents can be added
        # to doc_spec in _COMPARISON_SPECS without any schema change.
        for doc_type, field_names in doc_spec.items():
            doc_val = _get(doc_type, field_names)
            if not doc_val:
                continue

            # Skip if neither side has a value for this pair
            if not form_val and not doc_val:
                continue

            if form_val and doc_val:
                sim        = _field_similarity(doc_val, form_val)
                confidence = round(sim * 100, 2)
                if sim == 1.0:
                    result  = "Match"
                    remarks = None
                elif sim >= 0.70:
                    result  = "Partial Match"
                    remarks = "Values are similar but not identical"
                else:
                    result  = "Mismatch"
                    remarks = "Values differ significantly"
            else:
                result     = "No Form Value"
                confidence = None
                remarks    = "Form value not submitted"

            rows_to_create.append(VendorComparisonResult(
                registration      = vendor_reg,
                field_name        = label,
                document_type     = doc_type,
                document_value    = doc_val,
                form_value        = form_val,
                comparison_result = result,
                confidence_score  = confidence,
                remarks           = remarks,
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
        state  = parts[-1]
        city   = parts[-2]
        # Everything before city and state is address_line1 (joined back with commas)
        # — address_line1 itself may contain commas so we cannot split it further
        address_line1 = ", ".join(parts[:-2])
        address_line2 = ""
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

        profile = vendor_reg.profiles.first()
        gst     = vendor_reg.gst_details.first()
        bank    = vendor_reg.bank_details.first()

        response = Response({
            "registration_id":        vendor_reg.registration_id,
            "registration_status":    vendor_reg.registration_status,
            "current_stage":          vendor_reg.current_stage or "",
            "review_remarks":         vendor_reg.rejection_reason or "",
            "vendor_name":            (profile.vendor_name if profile else "") or "",
            "email":                  (vendor_reg.user.email if vendor_reg.user_id else "") or "",
            "phone":                  (profile.mobile if profile else "") or "",
            "pan":                    (vendor_reg.user.pan_number if vendor_reg.user_id else "") or "",
            "gstin":                  (gst.gstin if gst else "") or "",
            "goods_description":      (profile.goods_service_description if profile else "") or "",
            **_parse_address(profile.address if profile else ""),
            "state":                  (gst.state_name if gst else "") or "",
            "bank_name":              (bank.bank_name if bank else "") or "",
            "bank_branch":            (bank.branch_name if bank else "") or "",
            "account_type":           (bank.account_type if bank else "") or "",
            "ifsc":                   (bank.ifsc_code if bank else "") or "",
            "account_number":         (bank.account_number if bank else "") or "",
            "name_as_per_bank":       (bank.account_holder_name if bank else "") or "",
            "contact_person_ae":      (profile.contact_person if profile else "") or "",
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
        from django.db import transaction

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
        is_resubmission = vendor_reg.registration_status == "SEND_BACK"
        if is_resubmission:
            _prev_bank    = vendor_reg.bank_details.first()
            _prev_profile = vendor_reg.profiles.first()
            _prev_gst     = vendor_reg.gst_details.first()
            _prev_addr    = _parse_address(_prev_profile.address if _prev_profile else "")
            _prev_db: dict[str, str] = {
                "vendor_name":      (_prev_profile.vendor_name if _prev_profile else "") or "",
                "pan":              (vendor_reg.user.pan_number if vendor_reg.user_id else "") or "",
                "gstin":            (_prev_gst.gstin if _prev_gst else "") or "",
                # Profile fields (captured before profile is updated in step 3)
                "phone":             (_prev_profile.mobile if _prev_profile else "") or "",
                "email":             (vendor_reg.user.email if vendor_reg.user_id else "") or "",
                "goods_description": (_prev_profile.goods_service_description if _prev_profile else "") or "",
                "contact_person_ae": (_prev_profile.contact_person if _prev_profile else "") or "",
                # Bank fields
                "bank_name":         (_prev_bank.bank_name if _prev_bank else "") or "",
                "bank_branch":       (_prev_bank.branch_name if _prev_bank else "") or "",
                "account_type":      (_prev_bank.account_type if _prev_bank else "") or "",
                "ifsc":              ((_prev_bank.ifsc_code if _prev_bank else "") or "").upper(),
                "account_number":    (_prev_bank.account_number if _prev_bank else "") or "",
                "name_as_per_bank":  (_prev_bank.account_holder_name if _prev_bank else "") or "",
                # Address fields
                "address_line1":     _prev_addr.get("address_line1", ""),
                "city":              _prev_addr.get("city", ""),
                "state":             _prev_addr.get("state", ""),
                "pincode":           _prev_addr.get("pincode", ""),
            }
        else:
            _prev_db = {}

        # Compute new status in memory — only saved to DB after all related records succeed
        new_status = "RESUBMITTED" if vendor_reg.registration_status == "SEND_BACK" else "SUBMITTED"

        # 2. Build combined address string
        parts = [d["address_line1"]]
        if d.get("address_line2"):
            parts.append(d["address_line2"])
        parts.extend([d["city"], d["state"]])
        full_address = ", ".join(parts) + " - " + d["pincode"]

        # 3. Upsert VendorProfile
        VendorProfile.objects.update_or_create(
            registration=vendor_reg,
            defaults={
                "vendor_name":               d["vendor_name"],
                "address":                   full_address,
                "goods_service_description": d["goods_description"],
                "contact_person":            d["contact_person_ae"],
                "email":                     d.get("email", ""),
                "mobile":                    d.get("phone", ""),
            },
        )

        # 4. Upsert primary VendorGST record
        gstin      = d["gstin"].upper()
        state_code = gstin[:2] if len(gstin) >= 2 else None
        VendorGST.objects.update_or_create(
            registration=vendor_reg,
            defaults={
                "gstin":       gstin,
                "legal_name":  d["vendor_name"],
                "state_code":  state_code,
                "state_name":  d["state"],
                "gst_address": full_address,
                "is_primary":  "Y",
            },
        )

        # 5. Replace primary bank record (delete + re-create to avoid unique conflicts)
        vendor_reg.bank_details.filter(is_primary="Y").delete()
        VendorBankDetails.objects.create(
            registration        = vendor_reg,
            bank_name           = d["bank_name"],
            branch_name         = d.get("bank_branch", "") or None,
            account_holder_name = d["name_as_per_bank"],
            account_number      = d["account_number"],
            ifsc_code           = d["ifsc"].upper(),
            account_type        = d["account_type"],
            is_primary          = "Y",
        )

        # 1. Save registration status — done here (after profile/GST/bank) so a failure
        #    in those steps doesn't leave status=SUBMITTED with missing related data
        vendor_reg.registration_status = new_status
        vendor_reg.current_stage       = "FINANCE_REVIEW"
        vendor_reg.submitted_date      = timezone.now()
        vendor_reg.rejection_reason    = None
        vendor_reg.save()

        # 6. Log all fields where the vendor changed a value from the baseline.
        #    First submission  → baseline is the OCR-extracted value.
        #    Resubmission      → baseline is the previously saved DB value;
        #                        fall back to OCR if no DB value existed for that field.
        _LOG_FIELDS: dict[str, str] = {
            "vendor_name":       "Vendor Name",
            "email":             "Email Address",
            "phone":             "Phone / Mobile",
            "pan":               "PAN Number",
            "gstin":             "GSTIN",
            "goods_description": "Goods / Services",
            "address_line1":     "Address Line 1",
            "address_line2":     "Address Line 2",
            "city":              "City",
            "state":             "State",
            "pincode":           "PIN Code",
            "bank_name":         "Bank Name",
            "bank_branch":       "Bank Branch",
            "account_type":      "Account Type",
            "ifsc":              "IFSC Code",
            "account_number":    "Account Number",
            "name_as_per_bank":  "Name as per Bank",
            "contact_person_ae": "AE Contact Person",
        }
        _submitted_values: dict[str, str] = {
            "vendor_name":       d.get("vendor_name", "") or "",
            "email":             d.get("email", "") or "",
            "phone":             d.get("phone", "") or "",
            "pan":               d.get("pan", "") or "",
            "gstin":             d.get("gstin", "") or "",
            "goods_description": d.get("goods_description", "") or "",
            "address_line1":     d.get("address_line1", "") or "",
            "address_line2":     d.get("address_line2", "") or "",
            "city":              d.get("city", "") or "",
            "state":             d.get("state", "") or "",
            "pincode":           d.get("pincode", "") or "",
            "bank_name":         d.get("bank_name", "") or "",
            "bank_branch":       d.get("bank_branch", "") or "",
            "account_type":      d.get("account_type", "") or "",
            "ifsc":              (d.get("ifsc", "") or "").upper(),
            "account_number":    d.get("account_number", "") or "",
            "name_as_per_bank":  d.get("name_as_per_bank", "") or "",
            "contact_person_ae": d.get("contact_person_ae", "") or "",
        }
        # Fetch profile once — used for changed_by and action_by below
        _vendor_profile = vendor_reg.profiles.first()

        extracted = _build_extracted_fields(vendor_reg.registration_id)
        change_logs = []
        for form_key, display_name in _LOG_FIELDS.items():
            ocr_val = (extracted.get(form_key) or "").strip()
            sub_val = _submitted_values.get(form_key, "").strip()
            if not sub_val:
                continue

            if is_resubmission:
                # _prev_db is built at the top of the method before any updates
                prev_val = (_prev_db.get(form_key) or "").strip()
                original = prev_val or ocr_val
            else:
                original = ocr_val

            # Log if: field was submitted AND (no baseline exists OR value differs from baseline)
            if sub_val and (not original or original.upper() != sub_val.upper()):
                change_logs.append(VendorFieldChangeLog(
                    registration   = vendor_reg,
                    field_name     = display_name,
                    original_value = original or None,
                    modified_value = sub_val,
                    changed_by     = str(_vendor_profile.profile_id) if _vendor_profile else "",
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
            action       = vendor_reg.registration_status,
            comments     = None,
            action_by    = str(_vendor_profile.profile_id) if _vendor_profile else "",
        )

        return Response(
            {"message": "Registration form submitted successfully.", "registration_status": vendor_reg.registration_status},
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

        profile = vendor_reg.profiles.first()
        gst     = vendor_reg.gst_details.first()
        bank    = vendor_reg.bank_details.first()
        parsed  = _parse_address(profile.address if profile else "")

        submitted = {
            "vendor_name":      (profile.vendor_name if profile else "") or "",
            "pan":              (vendor_reg.user.pan_number if vendor_reg.user_id else "") or "",
            "gstin":            (gst.gstin if gst else "") or "",
            "bank_name":        (bank.bank_name if bank else "") or "",
            "bank_branch":      (bank.branch_name if bank else "") or "",
            "account_type":     (bank.account_type if bank else "") or "",
            "ifsc":             (bank.ifsc_code if bank else "") or "",
            "account_number":   (bank.account_number if bank else "") or "",
            "name_as_per_bank": (bank.account_holder_name if bank else "") or "",
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
