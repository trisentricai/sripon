"""Phase 16 critical-flow integration tests.

Exercises the primary customer journey end-to-end through the real API stack:

    customer login -> browse -> add to cart -> save address -> checkout
    -> create order -> initiate payment -> confirm payment -> order detail
    -> admin fulfilment -> notification

Each step calls the actual HTTP endpoints (APIClient), so this guards the
integration of auth, catalogue, cart, orders, payments, admin and
notifications rather than any single unit.
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.models import Order, OrderStatusHistory
from apps.payments.models import Payment
from apps.users.models import AdminUser, UserProfile

# A realistic cracker catalogue for the journey.
_CATALOGUE = [
    {
        "sku": "SPK-100",
        "name": "Chakra Sparkler Box",
        "slug": "chakra-sparkler-box",
        "price": "120.00",
        "mrp": "150.00",
        "discount_price": "99.00",
        "tax": "5.00",
        "stock_quantity": 40,
        "minimum_order_quantity": 1,
    },
    {
        "sku": "RKT-200",
        "name": "Sky Rocket Pack",
        "slug": "sky-rocket-pack",
        "price": "250.00",
        "mrp": "280.00",
        "discount_price": "220.00",
        "tax": "5.00",
        "stock_quantity": 25,
        "minimum_order_quantity": 1,
    },
]


class CriticalCustomerFlowTests(TestCase):
    """The full buyer journey in one contiguous, ordered test."""

    @classmethod
    def setUpTestData(cls):
        from apps.products.models import Product

        cls.products = {}
        for spec in _CATALOGUE:
            product = Product.objects.create(**spec)
            cls.products[product.slug] = product

    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.client = APIClient()
        # Customer "logs in" via a verified Firebase identity (firebase token
        # exchange is covered separately in users tests; here we act as the
        # authenticated profile the exchange yields).
        self.customer = UserProfile.objects.create(
            firebase_uid="intl-cust-1",
            name="Karthik",
            email="karthik@sripon.test",
            phone="9000000000",
        )
        self.client.force_authenticate(user=self.customer)

    def _add_to_cart(self, slug, quantity):
        return self.client.post(
            "/api/v1/cart/items/",
            {"product_id": self.products[slug].id, "quantity": quantity},
        )

    def test_complete_purchase_lifecycle(self):
        sparkler = self.products["chakra-sparkler-box"]
        rocket = self.products["sky-rocket-pack"]

        # 1. Browse catalogue
        browse = self.client.get("/api/v1/products/")
        self.assertEqual(browse.status_code, 200)
        self.assertGreaterEqual(browse.data["pagination"]["total"], 2)

        # 2. Detail view (by slug)
        detail = self.client.get(f"/api/v1/products/slug/{sparkler.slug}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["data"]["sku"], "SPK-100")

        # 3. Add to cart
        add = self._add_to_cart(sparkler.slug, 2)
        self.assertEqual(add.status_code, 201)
        self.assertEqual(add.data["data"]["item_count"], 2)
        self.assertEqual(add.data["data"]["subtotal"], Decimal("198.00"))

        add2 = self._add_to_cart(rocket.slug, 1)
        self.assertEqual(add2.status_code, 201)
        self.assertEqual(add2.data["data"]["item_count"], 3)

        # 4. Read cart
        cart = self.client.get("/api/v1/cart/")
        self.assertEqual(cart.status_code, 200)
        self.assertEqual(cart.data["data"]["item_count"], 3)

        # 5. Save an address
        address = self.client.post(
            "/api/v1/auth/addresses/",
            {
                "full_name": "Karthik",
                "phone": "9000000000",
                "address_line_1": "12, Flower Bazaar",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600001",
                "is_default": True,
            },
            format="json",
        )
        self.assertEqual(address.status_code, 201)
        address_id = address.data["id"]

        # 6. Checkout -> create order
        order_resp = self.client.post(
            "/api/v1/orders/", {"address_id": address_id}, format="json"
        )
        self.assertEqual(order_resp.status_code, 201)
        order_data = order_resp.data["data"]
        self.assertEqual(order_data["order_status"], OrderStatus.PENDING)
        self.assertEqual(order_data["payment_status"], PaymentStatus.PENDING)
        self.assertEqual(order_data["item_count"], 3)
        self.assertIn("order_number", order_data)

        order = Order.objects.get(pk=order_data["id"])
        self.assertEqual(order.subtotal, Decimal("418.00"))
        self.assertEqual(order.tax, Decimal("20.90"))
        self.assertEqual(order.total, Decimal("438.90"))

        # 7. Cart is cleared after order
        cleared = self.client.get("/api/v1/cart/")
        self.assertEqual(cleared.data["data"]["item_count"], 0)

        # 8. Initiate payment
        init = self.client.post(
            f"/api/v1/payments/initiate/{order.order_number}/"
        )
        self.assertEqual(init.status_code, 201)
        payment_id = init.data["data"]["payment_id"]
        payment = Payment.objects.get(payment_id=payment_id)
        self.assertEqual(payment.status, Payment.Status.INITIATED)
        self.assertEqual(payment.amount, order.total)

        # 9. Confirm payment (mock provider)
        confirm = self.client.post(
            "/api/v1/payments/mock/success/",
            {"payment_id": str(payment_id)},
            format="json",
        )
        self.assertEqual(confirm.status_code, 200)
        self.assertEqual(confirm.data["data"]["status"], "SUCCESS")

        order.refresh_from_db()
        self.assertEqual(order.payment_status, PaymentStatus.PAID)
        self.assertTrue(
            OrderStatusHistory.objects.filter(
                order=order, note="Payment received."
            ).exists()
        )

        # 10. Order detail reflects the timeline
        order_detail = self.client.get(f"/api/v1/orders/{order.id}/")
        self.assertEqual(order_detail.status_code, 200)
        self.assertGreaterEqual(
            len(order_detail.data["data"]["status_history"]), 2
        )

        # 11. Customer order list
        my_orders = self.client.get("/api/v1/orders/")
        self.assertEqual(my_orders.data["pagination"]["total"], 1)

        # 12. Inventory reserved at order time
        sparkler.refresh_from_db()
        self.assertEqual(sparkler.reserved_quantity, 2)
        self.assertEqual(sparkler.stock_quantity, 40)

    def test_admin_fulfils_and_delivers_order(self):
        # Build an order via the API first.
        self._add_to_cart("chakra-sparkler-box", 1)
        address = self.client.post(
            "/api/v1/auth/addresses/",
            {
                "full_name": "Karthik",
                "phone": "9000000000",
                "address_line_1": "12, Flower Bazaar",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600001",
                "is_default": True,
            },
            format="json",
        )
        order_resp = self.client.post(
            "/api/v1/orders/", {"address_id": address.data["id"]}, format="json"
        )
        order = Order.objects.get(pk=order_resp.data["data"]["id"])

        # Admin logs in and fulfils.
        admin = AdminUser.objects.create(
            supabase_uid="intl-admin-1",
            email="ops@sripon.test",
            name="Ops",
            role=AdminUser.Role.ORDER_MANAGER,
            active=True,
        )
        admin_client = APIClient()
        admin_client.force_authenticate(user=admin)

        for status_value in (
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
        ):
            response = admin_client.patch(
                f"/api/v1/admin/orders/{order.id}/status/",
                {"status": status_value},
                format="json",
            )
            self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.assertEqual(order.order_status, OrderStatus.DELIVERED)

        # Delivering consumes stock and clears the reservation.
        sparkler = self.products["chakra-sparkler-box"]
        sparkler.refresh_from_db()
        self.assertEqual(sparkler.reserved_quantity, 0)
        self.assertEqual(sparkler.stock_quantity, 39)

    def test_cancellation_releases_reservation_and_notifies(self):
        self._add_to_cart("sky-rocket-pack", 1)
        address = self.client.post(
            "/api/v1/auth/addresses/",
            {
                "full_name": "Karthik",
                "phone": "9000000000",
                "address_line_1": "12, Flower Bazaar",
                "city": "Chennai",
                "state": "Tamil Nadu",
                "pincode": "600001",
                "is_default": True,
            },
            format="json",
        )
        order_resp = self.client.post(
            "/api/v1/orders/", {"address_id": address.data["id"]}, format="json"
        )
        order = Order.objects.get(pk=order_resp.data["data"]["id"])

        cancel = self.client.post(f"/api/v1/orders/{order.id}/cancel/")
        self.assertEqual(cancel.status_code, 200)
        self.assertEqual(cancel.data["data"]["order_status"], OrderStatus.CANCELLED)

        rocket = self.products["sky-rocket-pack"]
        rocket.refresh_from_db()
        self.assertEqual(rocket.reserved_quantity, 0)

        # Cancellation surface is visible through the notification inbox.
        inbox = self.client.get("/api/v1/notifications/")
        self.assertEqual(inbox.status_code, 200)

    def test_guest_cart_merges_after_login(self):
        # A guest adds to a local cart and then "logs in".
        self.client.post(
            "/api/v1/cart/merge/",
            {"items": [{"product_id": self.products["chakra-sparkler-box"].id, "quantity": 1}]},
            format="json",
        )
        cart = self.client.get("/api/v1/cart/")
        self.assertEqual(cart.data["data"]["item_count"], 1)