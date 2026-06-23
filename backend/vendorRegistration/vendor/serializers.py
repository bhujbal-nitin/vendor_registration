from rest_framework import serializers
from .models import VendorDocument, VendorProfile, VendorGST, VendorBankDetails, VendorContactDetails


class RegisterRequestSerializer(serializers.Serializer):
    pan_number = serializers.CharField(max_length=10)
    email      = serializers.EmailField()


class LoginRequestSerializer(serializers.Serializer):
    pan_number = serializers.CharField(max_length=10)
    password   = serializers.CharField()


class DocumentSerializer(serializers.ModelSerializer):
    registration_id = serializers.IntegerField(source="registration.registration_id", read_only=True)

    class Meta:
        model  = VendorDocument
        fields = [
            "document_id", "registration_id", "document_type",
            "file_name", "file_path", "uploaded_by", "uploaded_date", "status",
        ]


class VendorProfileSerializer(serializers.ModelSerializer):
    registration_id = serializers.IntegerField(source="registration.registration_id", read_only=True)

    class Meta:
        model  = VendorProfile
        fields = ["profile_id", "registration_id", "address", "goods_service_description", "gstin", "created_date", "updated_date"]


class VendorGSTSerializer(serializers.ModelSerializer):
    registration_id = serializers.IntegerField(source="registration.registration_id", read_only=True)

    class Meta:
        model  = VendorGST
        fields = ["gst_id", "registration_id", "gst_number", "state_code", "state_name", "registered_address", "is_primary", "status", "created_date"]


class VendorBankDetailsSerializer(serializers.ModelSerializer):
    registration_id = serializers.IntegerField(source="registration.registration_id", read_only=True)

    class Meta:
        model  = VendorBankDetails
        fields = ["bank_id", "registration_id", "bank_name", "account_holder_name", "account_number", "ifsc_code", "branch_name", "account_type", "is_primary", "status"]


class VendorContactDetailsSerializer(serializers.ModelSerializer):
    registration_id = serializers.IntegerField(source="registration.registration_id", read_only=True)

    class Meta:
        model  = VendorContactDetails
        fields = ["contact_id", "registration_id", "contact_person", "designation", "email", "mobile", "is_primary"]


class RegistrationFormSerializer(serializers.Serializer):
    registration_id   = serializers.IntegerField()
    vendor_name       = serializers.CharField(max_length=255)
    email             = serializers.EmailField()
    phone             = serializers.CharField(max_length=15)
    address_line1     = serializers.CharField(max_length=500)
    address_line2     = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    city              = serializers.CharField(max_length=100)
    state             = serializers.CharField(max_length=100)
    pincode           = serializers.CharField(max_length=6)
    pan               = serializers.CharField(max_length=10)
    gstin             = serializers.CharField(max_length=15)
    goods_description = serializers.CharField(max_length=1000)
    bank_name         = serializers.CharField(max_length=100)
    bank_branch       = serializers.CharField(max_length=100)
    account_type      = serializers.CharField(max_length=30)
    ifsc              = serializers.CharField(max_length=11)
    account_number    = serializers.CharField(max_length=18)
    name_as_per_bank  = serializers.CharField(max_length=150)
    contact_person_ae = serializers.CharField(max_length=150)
