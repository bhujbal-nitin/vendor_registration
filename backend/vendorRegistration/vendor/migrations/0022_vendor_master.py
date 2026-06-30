from django.db import migrations


class Migration(migrations.Migration):
    """
    Creates tb_vendor_master — one row per registration, populated only after
    the vendor's ledger has been successfully created in Tally on approval.
    """

    dependencies = [("vendor", "0021_tally_sync_log")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS tb_vendor_master (
                    vendor_id         BIGSERIAL    PRIMARY KEY,
                    registration_id   BIGINT       NOT NULL UNIQUE
                        REFERENCES tb_vendor_registration(registration_id) ON DELETE CASCADE,
                    vendor_code       VARCHAR(50)  NOT NULL UNIQUE,
                    vendor_name       VARCHAR(255),
                    pan_number        VARCHAR(10),
                    gstin             VARCHAR(15),
                    address           VARCHAR(1000),
                    status            VARCHAR(20)  NOT NULL DEFAULT 'Active',
                    tally_ledger_code VARCHAR(100),
                    created_date      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                );
            """,
            reverse_sql="DROP TABLE IF EXISTS tb_vendor_master;",
        ),
    ]
