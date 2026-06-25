from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [("vendor", "0010_restructure_tables")]

    operations = [
        # Change file_path from TEXT to VARCHAR(1000)
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_documents ALTER COLUMN file_path TYPE VARCHAR(1000);",
            reverse_sql="ALTER TABLE tb_vendor_documents ALTER COLUMN file_path TYPE TEXT;",
        ),
        # Add file_size BIGINT
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;",
            reverse_sql="ALTER TABLE tb_vendor_documents DROP COLUMN IF EXISTS file_size;",
        ),
        # Change uploaded_by from INTEGER to VARCHAR(100)
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_documents ALTER COLUMN uploaded_by TYPE VARCHAR(100) USING uploaded_by::TEXT;",
            reverse_sql="ALTER TABLE tb_vendor_documents ALTER COLUMN uploaded_by TYPE INTEGER USING uploaded_by::INTEGER;",
        ),
        # Drop status column
        migrations.RunSQL(
            sql="ALTER TABLE tb_vendor_documents DROP COLUMN IF EXISTS status;",
            reverse_sql="ALTER TABLE tb_vendor_documents ADD COLUMN status VARCHAR(20) DEFAULT 'Pending';",
        ),
    ]
