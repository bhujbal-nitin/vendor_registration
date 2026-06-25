from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0015_profile_contact_fields")]

    operations = [
        # Drop the unique constraint on gstin — multiple registrations can share the same GSTIN
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  DROP CONSTRAINT IF EXISTS tb_vendor_registration_gst_gst_number_key;
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_gst_details
                  ADD CONSTRAINT tb_vendor_registration_gst_gst_number_key UNIQUE (gstin);
            """,
        ),
        # Ensure at most one GST record per registration (the real uniqueness rule)
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  DROP CONSTRAINT IF EXISTS uq_gst_per_registration;
                ALTER TABLE tb_vendor_gst_details
                  ADD CONSTRAINT uq_gst_per_registration UNIQUE (registration_id);
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_gst_details
                  DROP CONSTRAINT IF EXISTS uq_gst_per_registration;
            """,
        ),
    ]
