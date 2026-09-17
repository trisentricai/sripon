from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.coupons.models import Coupon, CouponUsage
from apps.orders.models import Order
from apps.products.models import Product
from apps.users.models import UserProfile


class CouponValidateApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = UserProfile.objects.create(firebase_uid="cust-1")

        self.product = Product.objects.create(
            sku="BB-1",
            name="Big Bang",
            slug="big-bang",
            price=Decimal("100"),
            discount_price=Decimal("80"),
            tax=Decimal("5"),
            stock_quantity=10,
        )
        self.client.force_authenticate(user=self.customer)
        self.client.post(
            "/api/v1/cart/items/",
            {"product_id": self.product.id, "quantity": 2},
        )

        self.now = timezone.now()
        self.coupon = Coupon.objects.create(
            code="fest10",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            minimum_order_value=Decimal("100"),
            maximum_discount=Decimal("50"),
            start_date=self.now - timedelta(days=1),
            expiry_date=self.now + timedelta(days=1),
            usage_limit=100,
            per_customer_limit=1,
            active=True,
        )
        self.url = "/api/v1/coupons/validate/"

    def test_validate_computes_discount_from_cart(self):
        # cart subtotal 160 (80 x 2) >= minimum 100 -> 10% => 16
        response = self.client.post(self.url, {"code": "fest10"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["discount"], Decimal("16.00"))

    def test_validate_respects_minimum_order_value(self):
        response = self.client.post(
            self.url, {"code": "fest10", "order_value": 80}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Minimum order value", response.data["message"])

    def test_validate_with_explicit_order_value(self):
        response = self.client.post(
            self.url, {"code": "fest10", "order_value": 200}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["discount"], Decimal("20.00"))

    def test_validate_upper_cases_code(self):
        response = self.client.post(
            self.url, {"code": " FEST10 ", "order_value": 200}
        )
        self.assertEqual(response.status_code, 200)

    def test_caps_percentage_discount(self):
        Coupon.objects.create(
            code="MEGA",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("50"),
            start_date=self.now - timedelta(days=1),
            expiry_date=self.now + timedelta(days=1),
        )
        response = self.client.post(
            self.url, {"code": "mega", "order_value": 200}
        )
        self.assertEqual(response.data["data"]["discount"], Decimal("100.00"))

    def test_fixed_amount_never_exceeds_order_value(self):
        Coupon.objects.create(
            code="FLAT",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("500"),
            start_date=self.now - timedelta(days=1),
            expiry_date=self.now + timedelta(days=1),
        )
        response = self.client.post(
            self.url, {"code": "FLAT", "order_value": 200}
        )
        self.assertEqual(response.data["data"]["discount"], Decimal("200.00"))

    def test_unknown_code_rejected(self):
        response = self.client.post(
            self.url, {"code": "NOPE", "order_value": 200}
        )
        self.assertEqual(response.status_code, 400)

    def test_expired_coupon_rejected(self):
        Coupon.objects.create(
            code="GONE",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            start_date=self.now - timedelta(days=2),
            expiry_date=self.now - timedelta(days=1),
        )
        response = self.client.post(
            self.url, {"code": "GONE", "order_value": 200}
        )
        self.assertEqual(response.status_code, 400)

    def test_per_customer_usage_limit_respected(self):
        order = Order.objects.create(
            order_number="SP-00000000-000001",
            customer=self.customer,
            address_snapshot={},
            subtotal=Decimal("200"),
            total=Decimal("200"),
        )
        CouponUsage.objects.create(
            coupon=self.coupon,
            customer=self.customer,
            order=order,
            applied_discount=Decimal("20"),
        )
        response = self.client.post(
            self.url, {"code": "fest10", "order_value": 200}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("already used", response.data["message"])

    def test_coupon_not_active_yet_rejected(self):
        Coupon.objects.create(
            code="EARLY",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("20"),
            start_date=self.now + timedelta(days=1),
            expiry_date=self.now + timedelta(days=5),
        )
        response = self.client.post(
            self.url, {"code": "EARLY", "order_value": 200}
        )
        self.assertEqual(response.status_code, 400)

    def test_inactive_coupon_rejected(self):
        Coupon.objects.create(
            code="OFF",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("20"),
            start_date=self.now - timedelta(days=1),
            expiry_date=self.now + timedelta(days=1),
            active=False,
        )
        response = self.client.post(
            self.url, {"code": "OFF", "order_value": 200}
        )
        self.assertEqual(response.status_code, 400)

    def test_anonymous_is_unauthorized(self):
        response = APIClient().post(
            self.url, {"code": "fest10", "order_value": 200}
        )
        self.assertEqual(response.status_code, 401)