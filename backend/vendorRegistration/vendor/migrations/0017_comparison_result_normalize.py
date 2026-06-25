"""
Normalise tb_vendor_comparison_result:

OLD structure: one row per field with up to 5 fixed document-value columns
    (pan_document_value, gst_document_value, bank_document_value,
     coi_document_value, msme_document_value)

NEW structure: one row per (field_name, document_type)
    - document_type  VARCHAR(50)   — which document the value came from
    - document_value VARCHAR(2000) — the OCR-extracted value from that document

Data migration: each old row is expanded into one row per non-null document column.
"""
from django.db import migrations


class Migration(migrations.Migration):

    atomic = False  # DROP + CREATE across statements — needs non-atomic execution
    dependencies = [("vendor", "0016_fix_gst_unique_constraint")]

    operations = [
        migrations.RunSQL(
            sql="""
                -- Step 1: Expand old rows into a staging table
                CREATE TABLE _comparison_stage AS
                SELECT
                    v.registration_id,
                    v.field_name,
                    d.doc_type   AS document_type,
                    d.doc_value  AS document_value,
                    v.form_value,
                    v.comparison_result,
                    v.confidence_score,
                    v.remarks,
                    v.created_date
                FROM tb_vendor_comparison_result v
                CROSS JOIN LATERAL (
                    VALUES
                        ('PAN Card',                     v.pan_document_value),
                        ('GST Certificate',              v.gst_document_value),
                        ('Cancelled Cheque',             v.bank_document_value),
                        ('Certificate of Incorporation', v.coi_document_value),
                        ('MSME Certificate',             v.msme_document_value)
                ) AS d(doc_type, doc_value)
                WHERE d.doc_value IS NOT NULL AND d.doc_value <> '';

                -- Step 2: Drop original table and recreate with new structure
                DROP TABLE tb_vendor_comparison_result;

                CREATE TABLE tb_vendor_comparison_result (
                    comparison_id     BIGSERIAL PRIMARY KEY,
                    registration_id   BIGINT NOT NULL
                                        REFERENCES tb_vendor_registration(registration_id)
                                        ON DELETE CASCADE,
                    field_name        VARCHAR(100),
                    document_type     VARCHAR(50),
                    document_value    VARCHAR(2000),
                    form_value        VARCHAR(2000),
                    comparison_result VARCHAR(30),
                    confidence_score  DECIMAL(5,2),
                    remarks           VARCHAR(2000),
                    created_date      TIMESTAMPTZ DEFAULT NOW()
                );

                -- Step 3: Load migrated data
                INSERT INTO tb_vendor_comparison_result
                    (registration_id, field_name, document_type, document_value,
                     form_value, comparison_result, confidence_score, remarks, created_date)
                SELECT
                    registration_id, field_name, document_type, document_value,
                    form_value, comparison_result, confidence_score, remarks, created_date
                FROM _comparison_stage;

                DROP TABLE _comparison_stage;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
