import random
from datetime import datetime


def generate_order_number() -> str:
    """Human-friendly, roughly-unique order number: SP-YYYYMMDD-XXXXXX."""
    stamp = datetime.now().strftime("%Y%m%d")
    seq = random.randint(100000, 999999)
    return f"SP-{stamp}-{seq}"