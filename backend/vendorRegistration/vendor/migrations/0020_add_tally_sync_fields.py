from django.db import migrations


class Migration(migrations.Migration):
    """
    Adds Tally ledger-sync tracking columns to tb_vendor_registration.
    Populated when a registration is approved and synced to Tally:
      tally_sync_status   — 'Synced' or 'Failed'
      tally_sync_date     — when the sync was last attempted
      tally_error_message — Tally's error text, if the last sync attempt failed
    """

    dependencies = [("vendor", "0019_fix_extraction_created_date_default")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_registration
                  ADD COLUMN IF NOT EXISTS tally_sync_status   VARCHAR(20),
                  ADD COLUMN IF NOT EXISTS tally_sync_date     TIMESTAMPTZ,
                  ADD COLUMN IF NOT EXISTS tally_error_message VARCHAR(2000);
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_registration
                  DROP COLUMN IF EXISTS tally_sync_status,
                  DROP COLUMN IF EXISTS tally_sync_date,
                  DROP COLUMN IF EXISTS tally_error_message;
            """,
        ),
    ]
