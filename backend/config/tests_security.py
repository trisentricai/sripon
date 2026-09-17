"""Phase 17 security tests: rate limiting on sensitive endpoints."""
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.products.models import Product
from apps.users.models import UserProfile


class RateLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.customer = UserProfile.objects.create(
            firebase_uid="rl-cust", name="Ravi", email="ravi@sripon.test"
        )
        self.product = Product.objects.create(
            sku="RL-1",
            name="Rate Rocket",
            slug="rate-rocket",
            price=Decimal("100"),
            stock_quantity=10,
        )

    def _login_client(self):
        client = APIClient()
        client.force_authenticate(user=self.customer)
        return client

    def test_coupon_validate_is_rate_limited(self):
        client = self._login_client()
        url = "/api/v1/coupons/validate/"
        responses = []
        for _ in range(21):
            responses.append(
                client.post(url, {"code": "NOPE"}, format="json").status_code
            )
        # First 20 succeed (400 for the invalid coupon); 21st is throttled (429).
        self.assertEqual(responses[:20].count(400), 20)
        self.assertEqual(responses[20], 429)

    def test_order_checkout_is_rate_limited(self):
        client = self._login_client()
        client.post(
            "/api/v1/cart/items/",
            {"product_id": self.product.id, "quantity": 1},
        )
        url = "/api/v1/orders/"
        statuses = []
        for _ in range(11):
            statuses.append(
                client.post(url, {"address_id": 1}, format="json").status_code
            )
        # First 10 hits hit the endpoint (404 address); 11th is throttled.
        self.assertEqual(statuses[10], 429)

    def test_payment_initiate_is_rate_limited(self):
        client = self._login_client()
        url = "/api/v1/payments/initiate/SP-20260917-000001/"
        statuses = []
        for _ in range(11):
            statuses.append(client.post(url).status_code)
        self.assertEqual(statuses[10], 429)

    def test_throttle_does_not_block_below_limit(self):
        client = self._login_client()
        url = "/api/v1/coupons/validate/"
        for _ in range(5):
            response = client.post(url, {"code": "NOPE"}, format="json")
            self.assertEqual(response.status_code, 400)

    def test_scoped_throttle_rate_configured(self):
        from rest_framework.settings import api_settings

        rates = api_settings.DEFAULT_THROTTLE_RATES
        self.assertEqual(rates["login"], "10/min")
        self.assertEqual(rates["coupon"], "20/min")
        self.assertEqual(rates["checkout"], "10/min")
        self.assertEqual(rates["payment"], "10/min")