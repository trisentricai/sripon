from datetime import timedelta

from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.coupons.models import Coupon
from apps.orders.models import Order
from apps.users.models import UserProfile


class CouponModelTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        self.valid_dates = {
            "start_date": self.now - timedelta(days=1),
            "expiry_date": self.now + timedelta(days=30),
        }

    def test_code_normalised_to_uppercase(self):
        coupon = Coupon.objects.create(
            code="fest10 ",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            **self.valid_dates,
        )
        coupon.refresh_from_db()
        self.assertEqual(coupon.code, "FEST10")

    def test_coupon_usage_unique_per_customer_order(self):
        customer = UserProfile.objects.create(
            firebase_uid="fire-2", name="C", email="c@sripon.in"
        )
        coupon = Coupon.objects.create(
            code="NOV25",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("25"),
            **self.valid_dates,
        )
        order = Order.objects.create(
            order_number="SP-20240101-000010",
            customer=customer,
            address_snapshot={},
            subtotal=Decimal("100"),
            total=Decimal("75"),
        )
        coupon.usages.create(customer=customer, order=order, applied_discount=Decimal("25"))
        self.assertEqual(coupon.usages.count(), 1)