from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0014_add_bank_branch")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_profile
                  ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150),
                  ADD COLUMN IF NOT EXISTS email          VARCHAR(255),
                  ADD COLUMN IF NOT EXISTS mobile         VARCHAR(15);
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_profile
                  DROP COLUMN IF EXISTS contact_person,
                  DROP COLUMN IF EXISTS email,
                  DROP COLUMN IF EXISTS mobile;
            """,
        ),
    ]
