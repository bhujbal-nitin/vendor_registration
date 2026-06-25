"""
Restructures tb_vendor_user, tb_vendor_registration, and tb_vendor_profile
to match the approved schema.

Changes:
  tb_vendor_user    — add pan_number; drop registration_id FK, failed_login_attempts,
                      password_changed_date, account_locked_date, created_by, updated_by
  tb_vendor_registration — add user_id FK, rejection_reason (from review_remarks);
                           drop pan_number, vendor_name, vendor_type, email, mobile,
                           approved_by, tally_sync_status, tally_sync_date,
                           tally_vendor_code, review_remarks; widen registration_status to 50
  tb_vendor_profile — add vendor_name, vendor_type, is_msme, msme_number, cin_number,
                      website; drop gstin
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0009_vendornotification")]

    operations = [

        # ── 1. Add user_id (nullable) to tb_vendor_registration ──────────────
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_registration ADD COLUMN IF NOT EXISTS user_id BIGINT;",
            reverse_sql="ALTER TABLE tb_vendor_registration DROP COLUMN IF EXISTS user_id;",
        ),

        # ── 2. Populate user_id from existing tb_vendor_user.registration_id ─
        migrations.RunSQL(
            sql="""
                UPDATE tb_vendor_registration r
                SET    user_id = u.user_id
                FROM   tb_vendor_user u
                WHERE  u.registration_id = r.registration_id;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 3. Add FK constraint ──────────────────────────────────────────────
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_reg_user'
                      AND table_name = 'tb_vendor_registration'
                  ) THEN
                    ALTER TABLE tb_vendor_registration
                      ADD CONSTRAINT fk_reg_user
                      FOREIGN KEY (user_id)
                      REFERENCES tb_vendor_user(user_id)
                      ON DELETE CASCADE;
                  END IF;
                END $$;
            """,
            reverse_sql="ALTER TABLE tb_vendor_registration DROP CONSTRAINT IF EXISTS fk_reg_user;",
        ),

        # ── 4. Add pan_number to tb_vendor_user ──────────────────────────────
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_user ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10);",
            reverse_sql="ALTER TABLE tb_vendor_user DROP COLUMN IF EXISTS pan_number;",
        ),

        # ── 5. Populate pan_number from tb_vendor_registration ───────────────
        migrations.RunSQL(
            sql="""
                UPDATE tb_vendor_user u
                SET    pan_number = r.pan_number
                FROM   tb_vendor_registration r
                WHERE  r.registration_id = u.registration_id;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 6. Add rejection_reason, copy from review_remarks ─────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_registration
                  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(2000);
                UPDATE tb_vendor_registration
                SET    rejection_reason = review_remarks
                WHERE  review_remarks IS NOT NULL;
            """,
            reverse_sql="ALTER TABLE tb_vendor_registration DROP COLUMN IF EXISTS rejection_reason;",
        ),

        # ── 7. Drop FK constraint on tb_vendor_user.registration_id ──────────
        migrations.RunSQL(
            sql="""
                DO $$
                DECLARE r RECORD;
                BEGIN
                  FOR r IN
                    SELECT tc.constraint_name
                    FROM   information_schema.table_constraints tc
                    JOIN   information_schema.key_column_usage   kc
                           ON tc.constraint_name = kc.constraint_name
                    WHERE  tc.table_name    = 'tb_vendor_user'
                      AND  tc.constraint_type = 'FOREIGN KEY'
                      AND  kc.column_name   = 'registration_id'
                  LOOP
                    EXECUTE 'ALTER TABLE tb_vendor_user DROP CONSTRAINT ' || r.constraint_name;
                  END LOOP;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 8. Drop extra columns from tb_vendor_user ─────────────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_user
                  DROP COLUMN IF EXISTS registration_id,
                  DROP COLUMN IF EXISTS failed_login_attempts,
                  DROP COLUMN IF EXISTS password_changed_date,
                  DROP COLUMN IF EXISTS account_locked_date,
                  DROP COLUMN IF EXISTS created_by,
                  DROP COLUMN IF EXISTS updated_by;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 9. Drop extra columns from tb_vendor_registration ─────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_registration
                  DROP COLUMN IF EXISTS pan_number,
                  DROP COLUMN IF EXISTS vendor_name,
                  DROP COLUMN IF EXISTS vendor_type,
                  DROP COLUMN IF EXISTS email,
                  DROP COLUMN IF EXISTS mobile,
                  DROP COLUMN IF EXISTS approved_by,
                  DROP COLUMN IF EXISTS tally_sync_status,
                  DROP COLUMN IF EXISTS tally_sync_date,
                  DROP COLUMN IF EXISTS tally_vendor_code,
                  DROP COLUMN IF EXISTS review_remarks;
                ALTER TABLE tb_vendor_registration
                  ALTER COLUMN registration_status TYPE VARCHAR(50);
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 10. Update tb_vendor_profile ──────────────────────────────────────
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_profile
                  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(100),
                  ADD COLUMN IF NOT EXISTS is_msme    CHAR(1),
                  ADD COLUMN IF NOT EXISTS msme_number VARCHAR(100),
                  ADD COLUMN IF NOT EXISTS cin_number  VARCHAR(50),
                  ADD COLUMN IF NOT EXISTS website     VARCHAR(255),
                  DROP COLUMN IF EXISTS gstin;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ── 11. Mark this migration in django_migrations (self-referential) ───
        # Nothing needed — Django records it automatically on success.
    ]
