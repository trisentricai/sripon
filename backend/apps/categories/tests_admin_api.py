"""Phase 12 admin category CRUD tests."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.products.models import Product
from apps.users.models import AdminUser

from .models import Category


class CategoryAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product_mgr = AdminUser.objects.create(
            supabase_uid="pm-cat",
            email="pm-cat@sripon.test",
            role=AdminUser.Role.PRODUCT_MANAGER,
            active=True,
        )
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm-cat",
            email="cm-cat@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.product_mgr)
        self.url = "/api/v1/admin/categories/"

    def test_requires_permission(self):
        self.client.force_authenticate(user=self.content_mgr)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_create_category(self):
        response = self.client.post(
            self.url,
            {"name": "Fountains", "slug": "fountains", "description": "Water features"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Category.objects.filter(slug="fountains").exists())

    def test_list_includes_inactive(self):
        Category.objects.create(name="Live", slug="live", active=True)
        Category.objects.create(name="Dead", slug="dead", active=False)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 2)

    def test_filter_active(self):
        Category.objects.create(name="Live", slug="live", active=True)
        Category.objects.create(name="Dead", slug="dead", active=False)
        response = self.client.get(self.url, {"active": "false"})
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["slug"], "dead")

    def test_patch_category(self):
        category = Category.objects.create(name="Old", slug="old")
        response = self.client.patch(
            f"{self.url}{category.pk}/", {"name": "New", "sort_order": 5},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        category.refresh_from_db()
        self.assertEqual(category.name, "New")
        self.assertEqual(category.sort_order, 5)

    def test_delete_without_products(self):
        category = Category.objects.create(name="Empty", slug="empty")
        response = self.client.delete(f"{self.url}{category.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Category.objects.filter(pk=category.pk).exists())

    def test_delete_with_products_deactivates(self):
        category = Category.objects.create(name="Busy", slug="busy")
        Product.objects.create(
            category=category, sku="BUSY-1", name="Busy", slug="busy-1",
            price=Decimal("10"),
        )
        response = self.client.delete(f"{self.url}{category.pk}/")
        self.assertEqual(response.status_code, 200)
        category.refresh_from_db()
        self.assertFalse(category.active)

    def test_cannot_be_own_parent(self):
        category = Category.objects.create(name="Loop", slug="loop")
        response = self.client.patch(
            f"{self.url}{category.pk}/", {"parent": category.pk}, format="json"
        )
        self.assertEqual(response.status_code, 400)