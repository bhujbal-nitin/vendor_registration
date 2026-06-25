import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("vendor", "0001_initial")]

    operations = [
        # On a FRESH database, 0001 creates tables with 'id' as PK.
        # Rename them to the correct column names expected by the rest of the migrations.
        # The DO $$ blocks are no-ops if the columns already have the right names
        # (safe for existing installs where this was previously faked).
        migrations.RunSQL(
            sql="""
                -- Rename 'id' → 'registration_id' in tb_vendor_registration if needed
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'tb_vendor_registration' AND column_name = 'id'
                    ) THEN
                        ALTER TABLE tb_vendor_registration RENAME COLUMN id TO registration_id;
                    END IF;
                END $$;

                -- Rename 'id' → 'user_id' in tb_vendor_user if needed
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'tb_vendor_user' AND column_name = 'id'
                    ) THEN
                        ALTER TABLE tb_vendor_user RENAME COLUMN id TO user_id;
                    END IF;
                END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # Sync Django's model state with the actual DB schema
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveField(model_name="vendorregistration", name="id"),
                migrations.AddField(
                    model_name="vendorregistration",
                    name="registration_id",
                    field=models.BigAutoField(primary_key=True, serialize=False),
                ),
                migrations.RemoveField(model_name="vendoruser", name="id"),
                migrations.AddField(
                    model_name="vendoruser",
                    name="user_id",
                    field=models.BigAutoField(primary_key=True, serialize=False),
                ),
                migrations.AlterField(
                    model_name="vendoruser",
                    name="registration",
                    field=models.OneToOneField(
                        blank=True,
                        db_column="registration_id",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="vendor_user",
                        to="vendor.vendorregistration",
                    ),
                ),
            ],
        ),

        # Create tb_vendor_documents
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS tb_vendor_documents (
                    document_id     BIGSERIAL    PRIMARY KEY,
                    registration_id BIGINT       NOT NULL
                        REFERENCES tb_vendor_registration(registration_id) ON DELETE CASCADE,
                    document_type   VARCHAR(50)  NOT NULL,
                    file_name       VARCHAR(255) NOT NULL,
                    file_path       TEXT         NOT NULL,
                    uploaded_by     INTEGER,
                    uploaded_date   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    status          VARCHAR(20)  NOT NULL DEFAULT 'Pending',
                    CONSTRAINT uq_vendor_doc UNIQUE (registration_id, document_type)
                );
            """,
            reverse_sql="DROP TABLE IF EXISTS tb_vendor_documents;",
        ),

        # Register VendorDocument in Django's state
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="VendorDocument",
                    fields=[
                        ("document_id", models.BigAutoField(primary_key=True, serialize=False)),
                        ("document_type", models.CharField(max_length=50)),
                        ("file_name", models.CharField(max_length=255)),
                        ("file_path", models.TextField()),
                        ("uploaded_by", models.IntegerField(blank=True, null=True)),
                        ("uploaded_date", models.DateTimeField(auto_now_add=True)),
                        ("status", models.CharField(default="Pending", max_length=20)),
                        (
                            "registration",
                            models.ForeignKey(
                                db_column="registration_id",
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="documents",
                                to="vendor.vendorregistration",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "tb_vendor_documents",
                        "unique_together": {("registration", "document_type")},
                    },
                ),
            ],
        ),
    ]
