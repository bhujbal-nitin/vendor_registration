from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vendor', '0005_add_vendor_document_extraction'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorFieldChangeLog',
            fields=[
                ('change_id',      models.BigAutoField(primary_key=True, serialize=False)),
                ('registration',   models.ForeignKey(
                    db_column='registration_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='field_changes',
                    to='vendor.vendorregistration',
                )),
                ('field_name',     models.CharField(max_length=100)),
                ('original_value', models.CharField(blank=True, max_length=2000, null=True)),
                ('modified_value', models.CharField(blank=True, max_length=2000, null=True)),
                ('changed_by',     models.CharField(blank=True, max_length=100, null=True)),
                ('changed_date',   models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'tb_vendor_field_change_log',
            },
        ),
    ]
