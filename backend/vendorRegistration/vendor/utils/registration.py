import re
from datetime import date


def generate_registration_no(today: date = None) -> str:
    from vendorRegistration.vendor.models import VendorRegistration

    if today is None:
        today = date.today()

    date_str = today.strftime("%Y%m%d")

    # Find the highest sequence number ever used across ALL days (not just today).
    # This ensures the counter never resets: VR-20260623-0002 → VR-20260624-0003.
    all_nos = VendorRegistration.objects.filter(
        registration_no__isnull=False
    ).values_list('registration_no', flat=True)

    max_seq = 0
    for no in all_nos:
        m = re.match(r'^VR-\d{8}-(\d+)$', no)
        if m:
            max_seq = max(max_seq, int(m.group(1)))

    seq = max_seq + 1
    return f"VR-{date_str}-{seq:04d}"
