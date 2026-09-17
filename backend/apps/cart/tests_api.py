from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem, Wishlist, WishlistItem
from apps.products.models import Product
from apps.users.models import AdminUser, UserProfile


class CartApiTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = UserProfile.objects.create(firebase_uid="cust-1", name="Cust")
        self.other = UserProfile.objects.create(firebase_uid="cust-2", name="Other")

        self.product = Product.objects.create(
            sku="BB-1",
            name="Big Bang",
            slug="big-bang",
            price=Decimal("100"),
            mrp=Decimal("120"),
            discount_price=Decimal("80"),
            tax=Decimal("5"),
            stock_quantity=10,
            reserved_quantity=2,
            minimum_order_quantity=1,
            maximum_order_quantity=10,
        )
        self.bulk = Product.objects.create(
            sku="BK-2",
            name="Bulk Pack",
            slug="bulk-pack",
            price=Decimal("50"),
            stock_quantity=20,
            minimum_order_quantity=5,
        )
        self.sold_out = Product.objects.create(
            sku="SO-3",
            name="Sold Out",
            slug="sold-out",
            price=Decimal("10"),
            stock_quantity=0,
        )
        self.inactive = Product.objects.create(
            sku="IN-4",
            name="Inactive",
            slug="inactive",
            price=Decimal("10"),
            stock_quantity=5,
            is_active=False,
        )

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.customer)


class CartApiTests(CartApiTestBase):
    def setUp(self):
        super().setUp()
        self.url = "/api/v1/cart/"

    def test_empty_cart_is_created_on_read(self):
        self.authenticate()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["item_count"], 0)
        self.assertEqual(response.data["data"]["total"], Decimal("0.00"))
        self.assertTrue(Cart.objects.filter(customer=self.customer).exists())

    def test_add_item_computes_server_totals(self):
        self.authenticate()
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.product.id, "quantity": 1}
        )
        self.assertEqual(response.status_code, 201)
        data = response.data["data"]
        self.assertEqual(data["item_count"], 1)
        self.assertEqual(data["subtotal"], Decimal("80.00"))
        self.assertEqual(data["discount_total"], Decimal("40.00"))
        self.assertEqual(data["tax_total"], Decimal("4.00"))
        self.assertEqual(data["total"], Decimal("84.00"))
        self.assertEqual(data["items"][0]["unit_price"], Decimal("80.00"))

    def test_repeat_add_sums_quantity(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.product.id, "quantity": 2}
        )
        self.assertEqual(response.data["data"]["item_count"], 3)
        self.assertEqual(CartItem.objects.get().quantity, 3)

    def test_add_below_minimum_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.bulk.id, "quantity": 2}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Minimum order quantity", response.data["message"])

    def test_add_above_maximum_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.product.id, "quantity": 11}
        )
        self.assertEqual(response.status_code, 400)

    def test_add_beyond_available_stock_is_rejected(self):
        self.authenticate()
        product = Product.objects.create(
            sku="LOW-1",
            name="Low Stock",
            slug="low-stock",
            price=Decimal("10"),
            stock_quantity=3,
        )
        response = self.client.post(
            f"{self.url}items/", {"product_id": product.id, "quantity": 4}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only 3", response.data["message"])

    def test_add_sold_out_product_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.sold_out.id}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("out of stock", response.data["message"])

    def test_add_inactive_product_is_rejected(self):
        self.authenticate()
        response = self.client.post(
            f"{self.url}items/", {"product_id": self.inactive.id}
        )
        self.assertEqual(response.status_code, 400)

    def test_add_unknown_product_returns_404(self):
        self.authenticate()
        response = self.client.post(f"{self.url}items/", {"product_id": 999999})
        self.assertEqual(response.status_code, 404)

    def test_totals_follow_current_price(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        self.product.discount_price = Decimal("60")
        self.product.save(update_fields=["discount_price"])

        response = self.client.get(self.url)
        self.assertEqual(response.data["data"]["subtotal"], Decimal("60.00"))
        self.assertEqual(response.data["data"]["total"], Decimal("63.00"))
        self.assertEqual(response.data["data"]["discount_total"], Decimal("60.00"))

    def test_update_quantity(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        item = CartItem.objects.get()

        response = self.client.patch(
            f"{self.url}items/{item.id}/", {"quantity": 4}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 4)
        self.assertEqual(response.data["data"]["total"], Decimal("336.00"))

    def test_update_quantity_to_zero_removes_item(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        item = CartItem.objects.get()

        response = self.client.patch(
            f"{self.url}items/{item.id}/", {"quantity": 0}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CartItem.objects.filter(pk=item.id).exists())
        self.assertEqual(response.data["data"]["item_count"], 0)

    def test_update_quantity_beyond_stock_is_rejected(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        item = CartItem.objects.get()
        response = self.client.patch(
            f"{self.url}items/{item.id}/", {"quantity": 9}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_delete_item(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        item = CartItem.objects.get()

        response = self.client.delete(f"{self.url}items/{item.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(CartItem.objects.filter(pk=item.id).exists())

    def test_delete_unknown_item_returns_404(self):
        self.authenticate()
        response = self.client.delete(f"{self.url}items/999999/")
        self.assertEqual(response.status_code, 404)

    def test_clear_cart(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        self.client.post(f"{self.url}items/", {"product_id": self.bulk.id, "quantity": 5})

        response = self.client.post(f"{self.url}clear/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["item_count"], 0)
        self.assertEqual(CartItem.objects.count(), 0)

    def test_merge_guest_items(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})

        response = self.client.post(
            f"{self.url}merge/",
            {
                "items": [
                    {"product_id": self.product.id, "quantity": 2},
                    {"product_id": self.bulk.id, "quantity": 1},
                    {"product_id": 999999, "quantity": 1},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["merge"]["merged"], 1)
        self.assertEqual(len(response.data["data"]["merge"]["skipped"]), 2)
        self.assertEqual(response.data["data"]["item_count"], 3)

    def test_customer_cart_is_isolated(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})

        other_client = APIClient()
        other_client.force_authenticate(user=self.other)
        response = other_client.get(self.url)
        self.assertEqual(response.data["data"]["item_count"], 0)

    def test_anonymous_cart_access_is_unauthorized(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_admin_account_cannot_use_customer_cart(self):
        admin = AdminUser.objects.create(
            supabase_uid="ad-1",
            email="admin@sripon.test",
            role=AdminUser.Role.ADMIN,
            active=True,
        )
        self.authenticate(admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)


class WishlistApiTests(CartApiTestBase):
    def setUp(self):
        super().setUp()
        self.url = "/api/v1/wishlist/"

    def test_wishlist_starts_empty(self):
        self.authenticate()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["item_count"], 0)
        self.assertTrue(Wishlist.objects.filter(customer=self.customer).exists())

    def test_add_and_list_wishlist_item(self):
        self.authenticate()
        response = self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["item_count"], 1)
        self.assertEqual(response.data["data"]["items"][0]["product"]["sku"], "BB-1")

    def test_add_is_idempotent(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        self.assertEqual(WishlistItem.objects.count(), 1)

    def test_add_unknown_product_returns_404(self):
        self.authenticate()
        response = self.client.post(f"{self.url}items/", {"product_id": 999999})
        self.assertEqual(response.status_code, 404)

    def test_remove_wishlist_item(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        response = self.client.delete(f"{self.url}items/{self.product.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["item_count"], 0)

    def test_remove_unknown_wishlist_item_returns_404(self):
        self.authenticate()
        response = self.client.delete(f"{self.url}items/999999/")
        self.assertEqual(response.status_code, 404)

    def test_move_to_cart(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.product.id})
        response = self.client.post(
            f"{self.url}items/{self.product.id}/move-to-cart/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["item_count"], 1)
        self.assertFalse(WishlistItem.objects.exists())
        self.assertEqual(CartItem.objects.get().quantity, 1)

    def test_move_to_cart_keeps_wishlist_when_stock_insufficient(self):
        self.authenticate()
        self.client.post(f"{self.url}items/", {"product_id": self.sold_out.id})
        response = self.client.post(
            f"{self.url}items/{self.sold_out.id}/move-to-cart/", {}, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(WishlistItem.objects.filter(product=self.sold_out).exists())

    def test_anonymous_wishlist_access_is_unauthorized(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 401)
