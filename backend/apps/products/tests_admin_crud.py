"""Phase 12 admin product CRUD & inventory endpoint tests."""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.users.models import AdminUser

from .models import Inventory, InventoryTransaction, Product


class AdminProductCrudTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product_mgr = AdminUser.objects.create(
            supabase_uid="pm-crud",
            email="pm@sripon.test",
            role=AdminUser.Role.PRODUCT_MANAGER,
            active=True,
        )
        self.order_mgr = AdminUser.objects.create(
            supabase_uid="om-crud",
            email="om-crud@sripon.test",
            role=AdminUser.Role.ORDER_MANAGER,
            active=True,
        )
        self.category = Category.objects.create(name="Rockets", slug="rockets")
        self.client.force_authenticate(user=self.product_mgr)
        self.url = "/api/v1/admin/products/"

    def _payload(self, **extra):
        payload = {
            "sku": "fw-001",
            "name": "Sky Rocket",
            "slug": "sky-rocket",
            "description": "A loud rocket.",
            "price": "120.00",
            "mrp": "150.00",
            "stock_quantity": 25,
            "category": self.category.pk,
        }
        payload.update(extra)
        return payload

    def test_requires_product_manager_permission(self):
        self.client.force_authenticate(user=self.order_mgr)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_create_product(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, 201)
        data = response.data["data"]
        self.assertEqual(data["sku"], "FW-001")
        product = Product.objects.get(pk=data["id"])
        self.assertTrue(product.is_active)
        self.assertTrue(Inventory.objects.filter(product=product).exists())

    def test_create_requires_sku_and_price(self):
        response = self.client.post(
            self.url, {"name": "No SKU", "slug": "no-sku"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_list_products_with_search(self):
        self.client.post(self.url, self._payload(), format="json")
        self.client.post(
            self.url,
            self._payload(sku="fw-002", name="Flower Pot", slug="flower-pot"),
            format="json",
        )
        response = self.client.get(self.url, {"search": "rocket"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["name"], "Sky Rocket")

    def test_list_paginated(self):
        self.client.post(self.url, self._payload(), format="json")
        response = self.client.get(self.url)
        self.assertIn("pagination", response.data)
        self.assertEqual(response.data["pagination"]["total"], 1)

    def test_patch_updates_and_syncs_inventory(self):
        created = self.client.post(self.url, self._payload(), format="json").data["data"]
        response = self.client.patch(
            f"{self.url}{created['id']}/",
            {"stock_quantity": 40, "price": "99.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["stock_quantity"], 40)
        inventory = Inventory.objects.get(product_id=created["id"])
        self.assertEqual(inventory.stock_quantity, 40)

    def test_detail_returns_admin_fields(self):
        created = self.client.post(self.url, self._payload(), format="json").data["data"]
        response = self.client.get(f"{self.url}{created['id']}/")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertIn("reserved_quantity", data)
        self.assertIn("is_active", data)
        self.assertIn("images", data)

    def test_delete_deactivates(self):
        created = self.client.post(self.url, self._payload(), format="json").data["data"]
        response = self.client.delete(f"{self.url}{created['id']}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Product.objects.get(pk=created["id"]).is_active)


class AdminInventoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product_mgr = AdminUser.objects.create(
            supabase_uid="pm-inv",
            email="pm-inv@sripon.test",
            role=AdminUser.Role.PRODUCT_MANAGER,
            active=True,
        )
        self.product = Product.objects.create(
            sku="INV-1", name="Sparklers", slug="sparklers",
            price=Decimal("50.00"), stock_quantity=3,
            reserved_quantity=0,
        )
        self.inventory = Inventory.objects.create(
            product=self.product, stock_quantity=3, reserved_quantity=0,
            low_stock_threshold=5,
        )
        self.client.force_authenticate(user=self.product_mgr)
        self.url = "/api/v1/admin/inventory/"

    def test_list_inventory(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total"], 1)
        row = response.data["data"][0]
        self.assertEqual(row["product_sku"], "INV-1")
        self.assertTrue(row["is_low_stock"])

    def test_filter_low_stock(self):
        response = self.client.get(self.url, {"state": "low"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)

    def test_filter_out_of_stock(self):
        Inventory.objects.filter(pk=self.inventory.pk).update(
            stock_quantity=0, reserved_quantity=0
        )
        response = self.client.get(self.url, {"state": "out"})
        self.assertEqual(len(response.data["data"]), 1)

    def test_adjust_stock_increases(self):
        response = self.client.patch(
            f"{self.url}{self.product.pk}/",
            {"quantity_change": 10, "reason": "PURCHASE", "reference": "PO-1"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["stock_quantity"], 13)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 13)
        self.assertEqual(
            InventoryTransaction.objects.filter(product=self.product).count(), 1
        )

    def test_adjust_stock_negative_rejected(self):
        response = self.client.patch(
            f"{self.url}{self.product.pk}/",
            {"quantity_change": -10},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_adjust_zero_rejected(self):
        response = self.client.patch(
            f"{self.url}{self.product.pk}/", {"quantity_change": 0}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_detail_lists_transactions(self):
        self.client.patch(
            f"{self.url}{self.product.pk}/",
            {"quantity_change": 5, "reason": "ADJUSTMENT"},
            format="json",
        )
        response = self.client.get(f"{self.url}{self.product.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]["transactions"]), 1)
        self.assertEqual(
            response.data["data"]["transactions"][0]["admin_name"],
            self.product_mgr.name,
        )