from django.db import migrations


class Migration(migrations.Migration):
    """
    Replaces the tally_sync_status/date/error_message columns on
    tb_vendor_registration (added in 0020) with a dedicated tb_tally_sync_log
    table that records every sync attempt, including the full request/response.
    """

    dependencies = [("vendor", "0020_add_tally_sync_fields")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_registration
                  DROP COLUMN IF EXISTS tally_sync_status,
                  DROP COLUMN IF EXISTS tally_sync_date,
                  DROP COLUMN IF EXISTS tally_error_message;

                CREATE TABLE IF NOT EXISTS tb_tally_sync_log (
                    sync_id          BIGSERIAL    PRIMARY KEY,
                    registration_id  BIGINT       NOT NULL
                        REFERENCES tb_vendor_registration(registration_id) ON DELETE CASCADE,
                    request_payload  TEXT,
                    response_payload TEXT,
                    sync_status      VARCHAR(20),
                    sync_date        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_registration
                  ADD COLUMN IF NOT EXISTS tally_sync_status   VARCHAR(20),
                  ADD COLUMN IF NOT EXISTS tally_sync_date     TIMESTAMPTZ,
                  ADD COLUMN IF NOT EXISTS tally_error_message VARCHAR(2000);

                DROP TABLE IF EXISTS tb_tally_sync_log;
            """,
        ),
    ]
