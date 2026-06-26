from django.db import migrations


class Migration(migrations.Migration):
    """
    The AE T4 workflow inserts directly into tb_vendor_document_extraction
    via raw SQL without including created_date. Django's auto_now_add=True
    only sets the value through the ORM — raw SQL bypasses it.

    This migration adds a DB-level DEFAULT NOW() so raw SQL INSERTs work
    without specifying created_date.
    """

    dependencies = [("vendor", "0018_remove_profile_unused_columns")]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE tb_vendor_document_extraction
                  ALTER COLUMN created_date SET DEFAULT NOW();
            """,
            reverse_sql="""
                ALTER TABLE tb_vendor_document_extraction
                  ALTER COLUMN created_date DROP DEFAULT;
            """,
        ),
    ]
