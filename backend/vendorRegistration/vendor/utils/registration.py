from datetime import date
from django.db.models import Count


def generate_registration_no(today: date = None) -> str:
    from vendorRegistration.vendor.models import VendorRegistration

    if today is None:
        today = date.today()

    date_str = today.strftime("%Y%m%d")

    count = VendorRegistration.objects.filter(
        created_date__date=today
    ).count()

    seq = count + 1
    return f"VR-{date_str}-{seq:04d}"
