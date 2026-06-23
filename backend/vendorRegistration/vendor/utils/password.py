import secrets
import bcrypt


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def generate_password(length: int = 10) -> str:
    upper   = "ABCDEFGHJKMNPQRSTUVWXYZ"
    lower   = "abcdefghjkmnpqrstuvwxyz"
    digits  = "23456789"
    special = "@#$!"
    alphabet = upper + lower + digits + special

    required = [
        secrets.choice(upper),
        secrets.choice(lower),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    rest = [secrets.choice(alphabet) for _ in range(length - len(required))]
    combined = required + rest
    secrets.SystemRandom().shuffle(combined)
    return "".join(combined)
