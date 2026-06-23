from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('vendor', '0008_vendorapprovalhistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='VendorNotification',
            fields=[
                ('notification_id',   models.BigAutoField(primary_key=True, serialize=False)),
                ('registration',      models.ForeignKey(
                    blank=True,
                    db_column='registration_id',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to='vendor.vendorregistration',
                )),
                ('recipient_email',   models.CharField(max_length=255)),
                ('notification_type', models.CharField(max_length=100)),
                ('subject',           models.CharField(max_length=500)),
                ('delivery_status',   models.CharField(max_length=20)),
                ('sent_date',         models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'tb_vendor_notifications',
            },
        ),
    ]
