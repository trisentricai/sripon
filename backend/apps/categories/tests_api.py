from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.products.models import Product


class CategoryApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.flowers = Category.objects.create(
            name="Flowers", slug="flowers", sort_order=1
        )
        self.fountains = Category.objects.create(
            name="Fountains", slug="fountains", parent=self.flowers, sort_order=1
        )
        self.mini = Category.objects.create(
            name="Mini Fountains", slug="mini-fountains", parent=self.fountains, sort_order=1
        )
        self.rockets = Category.objects.create(
            name="Rockets", slug="rockets", sort_order=2
        )
        self.hidden = Category.objects.create(
            name="Hidden", slug="hidden", active=False
        )

        self.root_product = Product.objects.create(
            category=self.flowers, sku="R-1", name="Root Flower", slug="root-flower",
            price=Decimal("10"),
        )
        self.child_product = Product.objects.create(
            category=self.fountains, sku="C-1", name="Child Fountain", slug="child-fountain",
            price=Decimal("20"),
        )
        self.deep_product = Product.objects.create(
            category=self.mini, sku="D-1", name="Deep Product", slug="deep-product",
            price=Decimal("30"),
        )
        self.inactive_product = Product.objects.create(
            category=self.fountains, sku="I-1", name="Inactive", slug="inactive",
            price=Decimal("5"), is_active=False,
        )

    def test_flat_list_excludes_inactive_and_counts_products(self):
        response = self.client.get("/api/v1/categories/")
        self.assertEqual(response.status_code, 200)
        names = [row["name"] for row in response.data["data"]]
        self.assertIn("Flowers", names)
        self.assertNotIn("Hidden", names)
        flowers = next(r for r in response.data["data"] if r["name"] == "Flowers")
        self.assertEqual(flowers["product_count"], 1)

    def test_tree_list_nests_children(self):
        response = self.client.get("/api/v1/categories/?tree=true")
        self.assertEqual(response.status_code, 200)
        roots = {row["name"]: row for row in response.data["data"]}
        self.assertIn("Flowers", roots)
        fountains = roots["Flowers"]["children"][0]
        self.assertEqual(fountains["name"], "Fountains")
        self.assertEqual(fountains["children"][0]["name"], "Mini Fountains")

    def test_retrieve_detail(self):
        response = self.client.get(f"/api/v1/categories/{self.flowers.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["slug"], "flowers")

    def test_detail_by_slug_includes_descendant_products(self):
        response = self.client.get("/api/v1/categories/slug/flowers/")
        self.assertEqual(response.status_code, 200)
        slugs = {p["slug"] for p in response.data["data"]["products"]}
        self.assertEqual(slugs, {"root-flower", "child-fountain", "deep-product"})
        self.assertNotIn("inactive", slugs)

    def test_unknown_slug_returns_404(self):
        response = self.client.get("/api/v1/categories/slug/nope/")
        self.assertEqual(response.status_code, 404)

    def test_unknown_id_returns_404(self):
        response = self.client.get("/api/v1/categories/999999/")
        self.assertEqual(response.status_code, 404)

    def test_category_products_endpoint_includes_tree(self):
        response = self.client.get(f"/api/v1/categories/{self.flowers.id}/products/")
        self.assertEqual(response.status_code, 200)
        slugs = {p["slug"] for p in response.data["data"]}
        self.assertEqual(slugs, {"root-flower", "child-fountain", "deep-product"})
        self.assertEqual(response.data["pagination"]["total"], 3)

    def test_category_products_scoped_to_subtree(self):
        response = self.client.get(f"/api/v1/categories/{self.rockets.id}/products/")
        self.assertEqual(response.data["pagination"]["total"], 0)