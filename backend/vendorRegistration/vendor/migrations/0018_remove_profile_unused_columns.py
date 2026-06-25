from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0017_comparison_result_normalize")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_profile
                  DROP COLUMN IF EXISTS is_msme,
                  DROP COLUMN IF EXISTS msme_number,
                  DROP COLUMN IF EXISTS cin_number;
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_profile
                  ADD COLUMN IF NOT EXISTS is_msme    CHAR(1),
                  ADD COLUMN IF NOT EXISTS msme_number VARCHAR(100),
                  ADD COLUMN IF NOT EXISTS cin_number  VARCHAR(50);
            """,
        ),
    ]
