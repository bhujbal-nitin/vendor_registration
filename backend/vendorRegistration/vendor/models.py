from django.db import models


class VendorUser(models.Model):
    user_id              = models.BigAutoField(primary_key=True)
    email                = models.EmailField(max_length=255, unique=True)
    pan_number           = models.CharField(max_length=10, null=True, blank=True)
    password_hash        = models.CharField(max_length=500)
    account_status       = models.CharField(max_length=20, default="Active")
    must_change_password = models.CharField(max_length=1, default="Y")
    last_login_date      = models.DateTimeField(null=True, blank=True)
    created_date         = models.DateTimeField(auto_now_add=True)
    updated_date         = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tb_vendor_user"

    def __str__(self):
        return self.email


class VendorRegistration(models.Model):
    registration_id     = models.BigAutoField(primary_key=True)
    registration_no     = models.CharField(max_length=50, unique=True, null=True, blank=True)
    user                = models.ForeignKey(
        VendorUser,
        on_delete=models.CASCADE,
        db_column="user_id",
        related_name="registrations",
        null=True,
        blank=True,
    )
    registration_status = models.CharField(max_length=50, default="DRAFT")
    current_stage       = models.CharField(max_length=50, default="ACCOUNT_CREATION", null=True, blank=True)
    submitted_date      = models.DateTimeField(null=True, blank=True)
    approved_date       = models.DateTimeField(null=True, blank=True)
    rejection_reason    = models.CharField(max_length=2000, null=True, blank=True)
    created_date        = models.DateTimeField(auto_now_add=True)
    updated_date        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tb_vendor_registration"

    def __str__(self):
        return f"{self.registration_no}"


class VendorProfile(models.Model):
    profile_id                = models.BigAutoField(primary_key=True)
    registration              = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="profiles",
    )
    vendor_name               = models.CharField(max_length=255, null=True, blank=True)
    vendor_type               = models.CharField(max_length=100, null=True, blank=True)
    address                   = models.CharField(max_length=1000, null=True, blank=True)
    goods_service_description = models.CharField(max_length=1000, null=True, blank=True)
    website                   = models.CharField(max_length=255, null=True, blank=True)
    contact_person            = models.CharField(max_length=150, null=True, blank=True)
    email                     = models.CharField(max_length=255, null=True, blank=True)
    mobile                    = models.CharField(max_length=15, null=True, blank=True)
    created_date              = models.DateTimeField(auto_now_add=True)
    updated_date              = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tb_vendor_profile"

    def __str__(self):
        return f"Profile({self.registration_id})"


class VendorDocument(models.Model):
    document_id   = models.BigAutoField(primary_key=True)
    registration  = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="documents",
    )
    document_type = models.CharField(max_length=50)
    file_name     = models.CharField(max_length=255)
    file_path     = models.CharField(max_length=1000)
    file_size     = models.BigIntegerField(null=True, blank=True)
    uploaded_by   = models.CharField(max_length=100, null=True, blank=True)
    uploaded_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_documents"
        unique_together = [("registration", "document_type")]

    def __str__(self):
        return f"{self.registration_id} — {self.document_type}"


class VendorGST(models.Model):
    gst_id       = models.BigAutoField(primary_key=True)
    registration = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="gst_details",
    )
    gstin        = models.CharField(max_length=15)
    legal_name   = models.CharField(max_length=255, null=True, blank=True)
    state_code   = models.CharField(max_length=2, null=True, blank=True)
    state_name   = models.CharField(max_length=100, null=True, blank=True)
    gst_address  = models.CharField(max_length=1000, null=True, blank=True)
    is_primary   = models.CharField(max_length=1, default="N")
    created_date = models.DateTimeField(auto_now_add=True)
    updated_date = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tb_vendor_gst_details"

    def __str__(self):
        return f"{self.gstin}"


class VendorBankDetails(models.Model):
    bank_id             = models.BigAutoField(primary_key=True)
    registration        = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="bank_details",
    )
    bank_name           = models.CharField(max_length=255)
    account_holder_name = models.CharField(max_length=255, null=True, blank=True)
    account_number      = models.CharField(max_length=100)
    ifsc_code           = models.CharField(max_length=20, null=True, blank=True)
    branch_name         = models.CharField(max_length=100, null=True, blank=True)
    account_type        = models.CharField(max_length=50, null=True, blank=True)
    is_primary          = models.CharField(max_length=1, default="N")
    created_date        = models.DateTimeField(auto_now_add=True)
    updated_date        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tb_vendor_bank_details"

    def __str__(self):
        return f"{self.bank_name} — {self.account_number}"



class VendorDocumentExtraction(models.Model):
    extraction_id    = models.BigAutoField(primary_key=True)
    document         = models.ForeignKey(
        VendorDocument,
        on_delete=models.CASCADE,
        db_column="document_id",
        related_name="extractions",
    )
    field_name       = models.CharField(max_length=100)
    field_value      = models.TextField(null=True, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_date     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_document_extraction"

    def __str__(self):
        return f"Doc {self.document_id} — {self.field_name}: {self.field_value}"


class VendorNotification(models.Model):
    notification_id   = models.BigAutoField(primary_key=True)
    registration      = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="notifications",
        null=True,
        blank=True,
    )
    recipient_email   = models.CharField(max_length=255)
    notification_type = models.CharField(max_length=100)
    subject           = models.CharField(max_length=500)
    delivery_status   = models.CharField(max_length=20)
    sent_date         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_notifications"

    def __str__(self):
        return f"{self.notification_type} → {self.recipient_email} [{self.delivery_status}]"


class VendorApprovalHistory(models.Model):
    approval_id   = models.BigAutoField(primary_key=True)
    registration  = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="approval_history",
    )
    action        = models.CharField(max_length=50)
    comments      = models.CharField(max_length=2000, null=True, blank=True)
    action_by     = models.CharField(max_length=100, null=True, blank=True)
    action_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_approval_history"

    def __str__(self):
        return f"Reg {self.registration_id} — {self.action} by {self.action_by}"


class VendorComparisonResult(models.Model):
    comparison_id     = models.BigAutoField(primary_key=True)
    registration      = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="comparison_results",
    )
    field_name        = models.CharField(max_length=100, null=True, blank=True)
    document_type     = models.CharField(max_length=50, null=True, blank=True)
    document_value    = models.CharField(max_length=2000, null=True, blank=True)
    form_value        = models.CharField(max_length=2000, null=True, blank=True)
    comparison_result = models.CharField(max_length=30, null=True, blank=True)
    confidence_score  = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remarks           = models.CharField(max_length=2000, null=True, blank=True)
    created_date      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_comparison_result"

    def __str__(self):
        return f"Reg {self.registration_id} — {self.field_name} [{self.document_type}]: {self.comparison_result}"


class VendorFieldChangeLog(models.Model):
    change_id      = models.BigAutoField(primary_key=True)
    registration   = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="field_changes",
    )
    field_name     = models.CharField(max_length=100)
    original_value = models.CharField(max_length=2000, null=True, blank=True)
    modified_value = models.CharField(max_length=2000, null=True, blank=True)
    changed_by     = models.CharField(max_length=100, null=True, blank=True)
    changed_date   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_vendor_field_change_log"

    def __str__(self):
        return f"Reg {self.registration_id} — {self.field_name} changed by {self.changed_by}"


class TallySyncLog(models.Model):
    """
    One row per Tally vendor-ledger sync attempt (insert-only, no upsert).
    Records the full request/response for audit and troubleshooting.
    """
    sync_id          = models.BigAutoField(primary_key=True)
    registration      = models.ForeignKey(
        VendorRegistration,
        on_delete=models.CASCADE,
        db_column="registration_id",
        related_name="tally_sync_logs",
    )
    request_payload  = models.TextField(null=True, blank=True)
    response_payload = models.TextField(null=True, blank=True)
    sync_status       = models.CharField(max_length=20, null=True, blank=True)
    sync_date         = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tb_tally_sync_log"

    def __str__(self):
        return f"Reg {self.registration_id} — {self.sync_status} @ {self.sync_date}"
