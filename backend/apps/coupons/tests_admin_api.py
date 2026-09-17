"""Phase 12 admin coupon CRUD tests."""
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.users.models import AdminUser

from .models import Coupon


class CouponAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.coupon_mgr = AdminUser.objects.create(
            supabase_uid="cm-coupon",
            email="coupon@sripon.test",
            role=AdminUser.Role.MANAGER,
            active=True,
        )
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm-content",
            email="content-coupon@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.coupon_mgr)
        self.url = "/api/v1/admin/coupons/"
        self.now = timezone.now()

    def _payload(self, **extra):
        payload = {
            "code": "diwali10",
            "discount_type": Coupon.DiscountType.PERCENTAGE,
            "discount_value": "10.00",
            "start_date": (self.now - timedelta(days=1)).isoformat(),
            "expiry_date": (self.now + timedelta(days=10)).isoformat(),
        }
        payload.update(extra)
        return payload

    def test_requires_permission(self):
        self.client.force_authenticate(user=self.content_mgr)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_create_coupon_uppercases_code(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["code"], "DIWALI10")

    def test_duplicate_code_rejected(self):
        self.client.post(self.url, self._payload(), format="json")
        response = self.client.post(
            self.url, self._payload(code="DIWALI10"), format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_percentage_over_100_rejected(self):
        response = self.client.post(
            self.url, self._payload(discount_value="150.00"), format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_bad_date_range_rejected(self):
        response = self.client.post(
            self.url,
            self._payload(
                start_date=(self.now + timedelta(days=5)).isoformat(),
                expiry_date=self.now.isoformat(),
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_list_and_filter_active(self):
        self.client.post(self.url, self._payload(), format="json")
        self.client.post(
            self.url, self._payload(code="inactive", active=False), format="json"
        )
        response = self.client.get(self.url, {"active": "true"})
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["code"], "DIWALI10")

    def test_patch_coupon(self):
        coupon = Coupon.objects.create(
            code="PATCHME",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value="50.00",
            start_date=self.now,
            expiry_date=self.now + timedelta(days=1),
        )
        response = self.client.patch(
            f"{self.url}{coupon.pk}/", {"active": False}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        coupon.refresh_from_db()
        self.assertFalse(coupon.active)

    def test_delete_unused_coupon(self):
        coupon = Coupon.objects.create(
            code="DELETE",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value="50.00",
            start_date=self.now,
            expiry_date=self.now + timedelta(days=1),
        )
        response = self.client.delete(f"{self.url}{coupon.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Coupon.objects.filter(pk=coupon.pk).exists())