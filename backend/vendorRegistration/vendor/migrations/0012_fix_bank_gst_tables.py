from django.db import migrations


class Migration(migrations.Migration):

    atomic = False   # multiple DDL operations on same table need non-atomic execution

    dependencies = [("vendor", "0011_fix_vendor_documents")]

    operations = [

        # ══════════════════════════════════════════════════════
        #  tb_vendor_bank_details
        # ══════════════════════════════════════════════════════

        # Widen column sizes
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_bank_details
                  ALTER COLUMN bank_name          TYPE VARCHAR(255),
                  ALTER COLUMN account_holder_name TYPE VARCHAR(255),
                  ALTER COLUMN account_number      TYPE VARCHAR(100),
                  ALTER COLUMN ifsc_code           TYPE VARCHAR(20),
                  ALTER COLUMN account_type        TYPE VARCHAR(50);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Convert is_primary boolean → CHAR(1) Y/N
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_bank_details
                  ADD COLUMN is_primary_new CHAR(1) DEFAULT 'N';
                UPDATE tb_vendor_bank_details
                  SET is_primary_new = CASE WHEN is_primary THEN 'Y' ELSE 'N' END;
                ALTER TABLE tb_vendor_bank_details
                  DROP COLUMN is_primary;
                ALTER TABLE tb_vendor_bank_details
                  RENAME COLUMN is_primary_new TO is_primary;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Drop branch_name and status
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_bank_details
                  DROP COLUMN IF EXISTS branch_name,
                  DROP COLUMN IF EXISTS status;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Add created_date and updated_date
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_bank_details
                  ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW(),
                  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_bank_details
                  DROP COLUMN IF EXISTS created_date,
                  DROP COLUMN IF EXISTS updated_date;
            """,
        ),

        # ══════════════════════════════════════════════════════
        #  tb_vendor_registration_gst → tb_vendor_gst_details
        # ══════════════════════════════════════════════════════

        # Rename table
        migrations.RunSQL(
            sql="ALTER TABLE IF EXISTS tb_vendor_registration_gst RENAME TO tb_vendor_gst_details;",
            reverse_sql="ALTER TABLE IF EXISTS tb_vendor_gst_details RENAME TO tb_vendor_registration_gst;",
        ),

        # Rename gst_number → gstin
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_gst_details RENAME COLUMN gst_number TO gstin;",
            reverse_sql="ALTER TABLE tb_vendor_gst_details RENAME COLUMN gstin TO gst_number;",
        ),

        # Add legal_name and gst_address
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  ADD COLUMN IF NOT EXISTS legal_name  VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS gst_address VARCHAR(1000);
                UPDATE tb_vendor_gst_details
                  SET gst_address = registered_address WHERE registered_address IS NOT NULL;
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_gst_details
                  DROP COLUMN IF EXISTS legal_name,
                  DROP COLUMN IF EXISTS gst_address;
            """,
        ),

        # Drop registered_address and status
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  DROP COLUMN IF EXISTS registered_address,
                  DROP COLUMN IF EXISTS status;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Narrow state_code VARCHAR(5) → VARCHAR(2)
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_gst_details ALTER COLUMN state_code TYPE VARCHAR(2);",
            reverse_sql="ALTER TABLE tb_vendor_gst_details ALTER COLUMN state_code TYPE VARCHAR(5);",
        ),

        # Convert is_primary boolean → CHAR(1) Y/N
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  ADD COLUMN is_primary_new CHAR(1) DEFAULT 'N';
                UPDATE tb_vendor_gst_details
                  SET is_primary_new = CASE WHEN is_primary THEN 'Y' ELSE 'N' END;
                ALTER TABLE tb_vendor_gst_details
                  DROP COLUMN is_primary;
                ALTER TABLE tb_vendor_gst_details
                  RENAME COLUMN is_primary_new TO is_primary;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Add updated_date
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_gst_details
                  ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();
            """,
            reverse_sql="ALTER TABLE tb_vendor_gst_details DROP COLUMN IF EXISTS updated_date;",
        ),
    ]
