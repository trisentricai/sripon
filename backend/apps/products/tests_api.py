from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, ProductImage
from apps.users.models import UserProfile


class ProductApiTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.firecrackers = Category.objects.create(
            name="Firecrackers", slug="firecrackers"
        )
        self.sparklers = Category.objects.create(name="Sparklers", slug="sparklers")

        self.big_bang = Product.objects.create(
            category=self.firecrackers,
            sku="BB-1",
            product_code="PC-100",
            name="Big Bang",
            slug="big-bang",
            brand="SriPon",
            price=Decimal("100"),
            mrp=Decimal("120"),
            discount_price=Decimal("80"),
            stock_quantity=10,
            is_featured=True,
            is_best_seller=True,
        )
        self.whistler = Product.objects.create(
            category=self.firecrackers,
            sku="WH-2",
            name="Whistler",
            slug="whistler",
            price=Decimal("50"),
            stock_quantity=0,
            is_new=True,
        )
        self.sparkler = Product.objects.create(
            category=self.sparklers,
            sku="SP-3",
            name="Sparkler Pack",
            slug="sparkler-pack",
            price=Decimal("200"),
            mrp=Decimal("250"),
            discount_price=Decimal("150"),
            stock_quantity=5,
            reserved_quantity=2,
        )
        self.hidden = Product.objects.create(
            category=self.sparklers,
            sku="HID-4",
            name="Hidden Product",
            slug="hidden-product",
            price=Decimal("10"),
            is_active=False,
        )
        ProductImage.objects.create(
            product=self.big_bang,
            public_id="sripon/big-bang",
            secure_url="https://cdn.test/big-bang.jpg",
            is_primary=True,
        )

        customer = UserProfile.objects.create(
            firebase_uid="buyer-1", name="Buyer", email="buyer@sripon.in"
        )
        order = Order.objects.create(
            order_number="SP-20240101-000100",
            customer=customer,
            address_snapshot={},
            subtotal=Decimal("0"),
            total=Decimal("0"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.whistler,
            name=self.whistler.name,
            unit_price=Decimal("50"),
            quantity=10,
            final_price=Decimal("50"),
            line_total=Decimal("500"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.big_bang,
            name=self.big_bang.name,
            unit_price=Decimal("80"),
            quantity=1,
            final_price=Decimal("80"),
            line_total=Decimal("80"),
        )


class ProductListApiTests(ProductApiTestBase):
    def _results(self, query=""):
        response = self.client.get(f"/api/v1/products/{query}")
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_only_active_products_are_listed(self):
        data = self._results()
        self.assertEqual(data["pagination"]["total"], 3)
        ids = [row["id"] for row in data["data"]]
        self.assertNotIn(self.hidden.id, ids)

    def test_pagination_page_size(self):
        data = self._results("?page_size=1")
        self.assertEqual(len(data["data"]), 1)
        self.assertEqual(data["pagination"]["total_pages"], 3)

    def test_search_matches_name_and_sku_case_insensitively(self):
        self.assertEqual(self._results("?q=whist")["pagination"]["total"], 1)
        self.assertEqual(self._results("?q=wh-2")["pagination"]["total"], 1)
        self.assertEqual(self._results("?q=pc-100")["pagination"]["total"], 1)

    def test_filter_by_category_and_category_in(self):
        data = self._results(f"?category={self.sparklers.id}")
        self.assertEqual(data["pagination"]["total"], 1)
        self.assertEqual(data["data"][0]["id"], self.sparkler.id)

        data = self._results(
            f"?category__in={self.firecrackers.id},{self.sparklers.id}"
        )
        self.assertEqual(data["pagination"]["total"], 3)

    def test_filter_by_effective_price_range(self):
        data = self._results("?min_price=60&max_price=160")
        ids = {row["id"] for row in data["data"]}
        self.assertEqual(ids, {self.big_bang.id, self.sparkler.id})

    def test_filter_by_availability(self):
        out = self._results("?availability=out_of_stock")
        self.assertEqual([row["id"] for row in out["data"]], [self.whistler.id])

        in_stock = self._results("?availability=in_stock")
        ids = {row["id"] for row in in_stock["data"]}
        self.assertEqual(ids, {self.big_bang.id, self.sparkler.id})

    def test_filter_discounted_featured_best_seller_new(self):
        discounted = self._results("?discounted=true")
        self.assertEqual(
            {row["id"] for row in discounted["data"]},
            {self.big_bang.id, self.sparkler.id},
        )
        featured = self._results("?featured=true")
        self.assertEqual([row["id"] for row in featured["data"]], [self.big_bang.id])
        best = self._results("?best_seller=true")
        self.assertEqual([row["id"] for row in best["data"]], [self.big_bang.id])
        new = self._results("?new=true")
        self.assertEqual([row["id"] for row in new["data"]], [self.whistler.id])

    def test_ordering_by_effective_price(self):
        asc = [row["id"] for row in self._results("?ordering=price")["data"]]
        self.assertEqual(asc, [self.whistler.id, self.big_bang.id, self.sparkler.id])
        desc = [row["id"] for row in self._results("?ordering=-price")["data"]]
        self.assertEqual(desc, list(reversed(asc)))

    def test_ordering_by_name(self):
        names = [row["name"] for row in self._results("?ordering=name")["data"]]
        self.assertEqual(names, sorted(names))

    def test_ordering_by_popularity(self):
        ids = [row["id"] for row in self._results("?ordering=popularity")["data"]]
        self.assertEqual(ids[0], self.whistler.id)

    def test_ordering_by_discount(self):
        ids = [row["id"] for row in self._results("?ordering=discount")["data"]]
        self.assertEqual(ids[0], self.sparkler.id)

    def test_invalid_ordering_falls_back_to_newest(self):
        data = self._results("?ordering=bogus")
        self.assertEqual(data["pagination"]["total"], 3)

    def test_list_includes_primary_image_and_pricing(self):
        data = self._results("?q=big")
        row = data["data"][0]
        self.assertEqual(row["effective_price"], "80.00")
        self.assertEqual(row["discount_percent"], "33.33")
        self.assertEqual(row["primary_image"]["secure_url"], "https://cdn.test/big-bang.jpg")
        self.assertTrue(row["in_stock"])


class ProductDetailApiTests(ProductApiTestBase):
    def test_retrieve_detail(self):
        response = self.client.get(f"/api/v1/products/{self.big_bang.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["slug"], "big-bang")
        self.assertEqual(len(response.data["data"]["images"]), 1)

    def test_retrieve_inactive_product_returns_404(self):
        response = self.client.get(f"/api/v1/products/{self.hidden.id}/")
        self.assertEqual(response.status_code, 404)

    def test_detail_by_slug(self):
        response = self.client.get("/api/v1/products/slug/sparkler-pack/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["id"], self.sparkler.id)

    def test_detail_by_unknown_slug_returns_404(self):
        response = self.client.get("/api/v1/products/slug/nope/")
        self.assertEqual(response.status_code, 404)
        self.assertFalse(response.data["success"])


class ProductCollectionApiTests(ProductApiTestBase):
    def test_best_sellers(self):
        response = self.client.get("/api/v1/products/best-sellers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["id"] for r in response.data["data"]], [self.big_bang.id])

    def test_new_arrivals(self):
        response = self.client.get("/api/v1/products/new-arrivals/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([r["id"] for r in response.data["data"]], [self.whistler.id])

    def test_suggestions_returns_matches(self):
        response = self.client.get("/api/v1/products/suggestions/?q=big")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["slug"], "big-bang")

    def test_suggestions_short_query_returns_empty(self):
        response = self.client.get("/api/v1/products/suggestions/?q=b")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"], [])