from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vendor', '0007_vendorcomparisonresult'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorApprovalHistory',
            fields=[
                ('approval_id',  models.BigAutoField(primary_key=True, serialize=False)),
                ('registration', models.ForeignKey(
                    db_column='registration_id',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='approval_history',
                    to='vendor.vendorregistration',
                )),
                ('action',       models.CharField(max_length=50)),
                ('comments',     models.CharField(blank=True, max_length=2000, null=True)),
                ('action_by',    models.CharField(blank=True, max_length=100, null=True)),
                ('action_date',  models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'tb_vendor_approval_history',
            },
        ),
    ]
