"""Coupon evaluation (backend-authoritative, server-only)."""
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .models import Coupon, CouponUsage


class CouponError(Exception):
    pass


def evaluate_coupon(code, customer, order_value: Decimal) -> Decimal:
    """Validate a coupon and return the discount amount for ``order_value``."""
    coupon, discount = validate_coupon(code, customer, order_value)
    return discount


def validate_coupon(code, customer, order_value: Decimal):
    """Validate a coupon; returns ``(coupon, discount)``.

    Raises ``CouponError`` with a user-friendly message on failure.
    """
    code = (code or "").strip().upper()
    coupon = Coupon.objects.filter(code=code).first()
    if coupon is None:
        raise CouponError("Invalid coupon code.")

    if not coupon.active:
        raise CouponError("This coupon is no longer active.")

    now = timezone.now()
    if now < coupon.start_date:
        raise CouponError("This coupon is not active yet.")
    if now > coupon.expiry_date:
        raise CouponError("This coupon has expired.")

    if coupon.minimum_order_value and order_value < coupon.minimum_order_value:
        raise CouponError(
            f"Minimum order value for this coupon is {coupon.minimum_order_value}."
        )

    total_uses = coupon.usages.count()
    if coupon.usage_limit is not None and total_uses >= coupon.usage_limit:
        raise CouponError("This coupon has reached its usage limit.")

    customer_uses = coupon.usages.filter(customer=customer).count()
    if customer_uses >= coupon.per_customer_limit:
        raise CouponError("You have already used this coupon.")

    if coupon.discount_type == Coupon.DiscountType.PERCENTAGE:
        discount = (order_value * coupon.discount_value / 100).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if coupon.maximum_discount is not None:
            discount = min(discount, coupon.maximum_discount)
    else:
        discount = min(coupon.discount_value, order_value)

    return coupon, discount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
