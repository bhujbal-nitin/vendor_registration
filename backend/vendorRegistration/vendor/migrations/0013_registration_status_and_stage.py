from django.db import migrations


class Migration(migrations.Migration):

    atomic = False
    dependencies = [("vendor", "0012_fix_bank_gst_tables")]

    operations = [

        # ── 1. Add current_stage column ───────────────────────────────────────
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_registration ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50);",
            reverse_sql="ALTER TABLE tb_vendor_registration DROP COLUMN IF EXISTS current_stage;",
        ),

        # ── 2. Set current_stage from existing status + document count ─────────
        migrations.RunSQL(
            sql="""
                UPDATE tb_vendor_registration r SET current_stage =
                  CASE
                    WHEN r.registration_status IN ('Draft', 'DRAFT') AND
                         (SELECT COUNT(*) FROM tb_vendor_documents d
                          WHERE d.registration_id = r.registration_id) = 0
                    THEN 'ACCOUNT_CREATION'

                    WHEN r.registration_status IN ('Draft', 'DRAFT') AND
                         (SELECT COUNT(*) FROM tb_vendor_documents d
                          WHERE d.registration_id = r.registration_id) > 0
                    THEN 'DOCUMENT_UPLOAD'

                    WHEN r.registration_status IN ('Submitted', 'SUBMITTED',
                         'Resubmitted', 'RESUBMITTED', 'Under Review', 'UNDER_REVIEW')
                    THEN 'FINANCE_REVIEW'

                    WHEN r.registration_status IN ('Sent Back', 'SEND_BACK')
                    THEN 'FORM_COMPLETION'

                    WHEN r.registration_status IN ('Approved', 'APPROVED')
                    THEN 'TALLY_SYNC'

                    WHEN r.registration_status IN ('Rejected', 'REJECTED',
                         'Completed', 'COMPLETED', 'Tally Sync Pending')
                    THEN 'COMPLETED'

                    ELSE 'ACCOUNT_CREATION'
                  END;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 3. Migrate registration_status to new uppercase format ─────────────
        migrations.RunSQL(
            sql="""
                UPDATE tb_vendor_registration SET registration_status =
                  CASE registration_status
                    WHEN 'Draft'              THEN 'DRAFT'
                    WHEN 'Submitted'          THEN 'SUBMITTED'
                    WHEN 'Under Review'       THEN 'UNDER_REVIEW'
                    WHEN 'Sent Back'          THEN 'SEND_BACK'
                    WHEN 'Resubmitted'        THEN 'RESUBMITTED'
                    WHEN 'Approved'           THEN 'APPROVED'
                    WHEN 'Rejected'           THEN 'REJECTED'
                    WHEN 'Tally Sync Pending' THEN 'APPROVED'
                    WHEN 'Completed'          THEN 'APPROVED'
                    ELSE registration_status
                  END;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
