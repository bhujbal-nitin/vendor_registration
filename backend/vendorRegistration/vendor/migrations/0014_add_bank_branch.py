from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0013_registration_status_and_stage")]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_bank_details ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);",
            reverse_sql="ALTER TABLE tb_vendor_bank_details DROP COLUMN IF EXISTS branch_name;",
        ),
    ]
