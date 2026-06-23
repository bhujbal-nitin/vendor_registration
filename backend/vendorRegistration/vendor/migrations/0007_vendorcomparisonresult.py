from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vendor', '0006_vendorfieldchangelog'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorComparisonResult',
            fields=[
                ('comparison_id',       models.BigAutoField(primary_key=True, serialize=False)),
                ('registration',        models.ForeignKey(
                    db_column='registration_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comparison_results',
                    to='vendor.vendorregistration',
                )),
                ('field_name',          models.CharField(max_length=100)),
                ('pan_document_value',  models.CharField(blank=True, max_length=2000, null=True)),
                ('gst_document_value',  models.CharField(blank=True, max_length=2000, null=True)),
                ('bank_document_value', models.CharField(blank=True, max_length=2000, null=True)),
                ('coi_document_value',  models.CharField(blank=True, max_length=2000, null=True)),
                ('msme_document_value', models.CharField(blank=True, max_length=2000, null=True)),
                ('form_value',          models.CharField(blank=True, max_length=2000, null=True)),
                ('comparison_result',   models.CharField(blank=True, max_length=30, null=True)),
                ('confidence_score',    models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('remarks',             models.CharField(blank=True, max_length=2000, null=True)),
                ('created_date',        models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'tb_vendor_comparison_result',
            },
        ),
    ]
