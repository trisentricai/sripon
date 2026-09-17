"""Phase 12 admin customer & admin-user management tests."""
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Order

from .models import AdminUser, UserProfile


class CustomerAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.manager = AdminUser.objects.create(
            supabase_uid="mgr-cust",
            email="mgr@sripon.test",
            role=AdminUser.Role.MANAGER,
            active=True,
        )
        self.analyst = AdminUser.objects.create(
            supabase_uid="analyst-cust",
            email="analyst-cust@sripon.test",
            role=AdminUser.Role.ANALYST,
            active=True,
        )
        self.customer = UserProfile.objects.create(
            firebase_uid="cust-1", name="Meena", email="meena@sripon.test",
            phone="9876543210",
        )
        Order.objects.create(
            order_number="SP-20260917-CUST01",
            customer=self.customer,
            address_snapshot={},
            subtotal=Decimal("500.00"),
            total=Decimal("500.00"),
            payment_status="PAID",
            order_status="PENDING",
            placed_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.manager)
        self.url = "/api/v1/admin/customers/"

    def test_requires_permission(self):
        self.client.force_authenticate(user=self.analyst)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_list_customers_with_metrics(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total"], 1)
        row = response.data["data"][0]
        self.assertEqual(row["order_count"], 1)
        self.assertEqual(row["total_spent"], "500.00")

    def test_search_customers(self):
        response = self.client.get(self.url, {"search": "meena"})
        self.assertEqual(len(response.data["data"]), 1)
        response = self.client.get(self.url, {"search": "nomatch"})
        self.assertEqual(len(response.data["data"]), 0)

    def test_customer_detail_includes_orders_and_addresses(self):
        response = self.client.get(f"{self.url}{self.customer.pk}/")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(len(data["recent_orders"]), 1)
        self.assertEqual(data["addresses"], [])

    def test_toggle_customer_active(self):
        response = self.client.patch(
            f"{self.url}{self.customer.pk}/", {"active": False}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.active)


class AdminUserManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.super_admin = AdminUser.objects.create(
            supabase_uid="super-1",
            email="super@sripon.test",
            name="Super",
            role=AdminUser.Role.SUPER_ADMIN,
            active=True,
        )
        self.product_mgr = AdminUser.objects.create(
            supabase_uid="pm-users",
            email="pm-users@sripon.test",
            role=AdminUser.Role.PRODUCT_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.super_admin)
        self.url = "/api/v1/admin/admin-users/"

    def test_requires_super_admin(self):
        self.client.force_authenticate(user=self.product_mgr)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_list_admin_users(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 2)

    def test_create_admin_user(self):
        response = self.client.post(
            self.url,
            {
                "supabase_uid": "new-admin-uid",
                "email": "NewAdmin@sripon.test",
                "name": "New Admin",
                "role": AdminUser.Role.ORDER_MANAGER,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["email"], "newadmin@sripon.test")

    def test_create_requires_supabase_uid(self):
        response = self.client.post(
            self.url,
            {"email": "no-uid@sripon.test", "name": "No UID"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_change_role(self):
        response = self.client.patch(
            f"{self.url}{self.product_mgr.pk}/",
            {"role": AdminUser.Role.ADMIN},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.product_mgr.refresh_from_db()
        self.assertEqual(self.product_mgr.role, AdminUser.Role.ADMIN)

    def test_cannot_deactivate_self(self):
        response = self.client.delete(f"{self.url}{self.super_admin.pk}/")
        self.assertEqual(response.status_code, 400)

    def test_deactivate_other_admin(self):
        response = self.client.delete(f"{self.url}{self.product_mgr.pk}/")
        self.assertEqual(response.status_code, 200)
        self.product_mgr.refresh_from_db()
        self.assertFalse(self.product_mgr.active)