from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.coupons.models import Coupon, CouponUsage
from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.models import Order, OrderItem, OrderStatusHistory
from apps.products.models import InventoryTransaction, Product
from apps.settings.models import SiteSetting
from apps.users.models import Address, AdminUser, UserProfile


class CheckoutTestBase(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.client = APIClient()
        self.customer = UserProfile.objects.create(
            firebase_uid="cust-1", name="Buyer", phone="9999999999"
        )
        self.address = Address.objects.create(
            customer=self.customer,
            full_name="Buyer",
            phone="9999999999",
            address_line_1="1 Market St",
            city="Chennai",
            state="TN",
            pincode="600001",
            is_default=True,
        )
        self.product = Product.objects.create(
            sku="BB-1",
            name="Big Bang",
            slug="big-bang",
            price=Decimal("100"),
            mrp=Decimal("120"),
            discount_price=Decimal("80"),
            tax=Decimal("5"),
            stock_quantity=10,
            minimum_order_quantity=1,
        )
        self.client.force_authenticate(user=self.customer)
        self.client.post(
            "/api/v1/cart/items/",
            {"product_id": self.product.id, "quantity": 2},
        )
        self.orders_url = "/api/v1/orders/"

    def place_from_cart(self, **extra):
        payload = {"address_id": self.address.id}
        payload.update(extra)
        return self.client.post(self.orders_url, payload, format="json")


class CheckoutTests(CheckoutTestBase):
    def test_place_order_from_cart(self):
        response = self.place_from_cart()
        self.assertEqual(response.status_code, 201)
        data = response.data["data"]
        self.assertEqual(data["order_status"], OrderStatus.PENDING)
        self.assertEqual(data["payment_status"], PaymentStatus.PENDING)
        self.assertEqual(data["subtotal"], "160.00")
        self.assertEqual(data["discount"], "0.00")
        self.assertEqual(data["tax"], "8.00")
        self.assertEqual(data["delivery_fee"], "0.00")
        self.assertEqual(data["total"], "168.00")
        self.assertEqual(data["item_count"], 2)
        self.assertEqual(data["address_snapshot"]["pincode"], "600001")
        self.assertEqual(len(data["items"]), 1)
        self.assertEqual(data["items"][0]["unit_price"], "80.00")

        order = Order.objects.get()
        self.assertRegex(order.order_number, r"^SP-\d{8}-\d{6}$")
        self.assertEqual(order.items.get().name, "Big Bang")
        self.assertEqual(order.items.get().sku, "BB-1")

    def test_place_order_reserves_inventory_and_clears_cart(self):
        self.place_from_cart()
        self.product.refresh_from_db()
        self.assertEqual(self.product.reserved_quantity, 2)
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(
            InventoryTransaction.objects.filter(
                reason=InventoryTransaction.Reason.RESERVATION
            ).count(),
            1,
        )
        self.assertEqual(Product.objects.get().cart_items.count(), 0)

    def test_place_order_records_status_history(self):
        self.place_from_cart()
        history = OrderStatusHistory.objects.get()
        self.assertEqual(history.to_status, OrderStatus.PENDING)

    def test_empty_cart_is_rejected(self):
        self.client.post("/api/v1/cart/clear/")
        response = self.place_from_cart()
        self.assertEqual(response.status_code, 400)
        self.assertIn("empty", response.data["message"])

    def test_invalid_address_returns_404(self):
        response = self.place_from_cart(address_id=999999)
        self.assertEqual(response.status_code, 404)

    def test_address_of_another_customer_is_rejected(self):
        other = UserProfile.objects.create(firebase_uid="other-1")
        other_address = Address.objects.create(
            customer=other,
            full_name="Other",
            phone="8888888888",
            address_line_1="2 Other St",
            city="Madurai",
            state="TN",
            pincode="625001",
        )
        response = self.place_from_cart(address_id=other_address.id)
        self.assertEqual(response.status_code, 404)

    def test_place_order_with_explicit_items_bypasses_cart(self):
        response = self.place_from_cart(
            items=[{"product_id": self.product.id, "quantity": 3}]
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["item_count"], 3)
        # cart untouched
        self.assertEqual(Product.objects.get().cart_items.count(), 1)

    def test_insufficient_stock_rejected(self):
        response = self.place_from_cart(
            items=[{"product_id": self.product.id, "quantity": 99}]
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Only 10", response.data["message"])

    def test_coupon_applied_and_usage_recorded(self):
        now = timezone.now()
        coupon = Coupon.objects.create(
            code="FEST10",
            discount_type=Coupon.DiscountType.PERCENTAGE,
            discount_value=Decimal("10"),
            minimum_order_value=Decimal("100"),
            start_date=now - timedelta(days=1),
            expiry_date=now + timedelta(days=1),
        )
        response = self.place_from_cart(coupon_code="fest10")
        self.assertEqual(response.status_code, 201)
        data = response.data["data"]
        self.assertEqual(data["discount"], "16.00")
        self.assertEqual(data["total"], "152.00")
        self.assertEqual(
            CouponUsage.objects.get().applied_discount, Decimal("16.00")
        )

    def test_invalid_coupon_rejected(self):
        response = self.place_from_cart(coupon_code="NOPE")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid coupon", response.data["message"])
        self.assertFalse(Order.objects.exists())

    def test_coupon_per_customer_second_use_rejected(self):
        now = timezone.now()
        Coupon.objects.create(
            code="ONCE",
            discount_type=Coupon.DiscountType.FIXED_AMOUNT,
            discount_value=Decimal("20"),
            start_date=now - timedelta(days=1),
            expiry_date=now + timedelta(days=1),
            per_customer_limit=1,
        )
        self.assertEqual(self.place_from_cart(coupon_code="once").status_code, 201)
        response = self.place_from_cart(
            coupon_code="once",
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("already used", response.data["message"])

    def test_minimum_order_value_enforced(self):
        SiteSetting.objects.create(key="min_order_value", value={"amount": "200"})
        response = self.place_from_cart()
        self.assertEqual(response.status_code, 400)
        self.assertIn("Minimum order value", response.data["message"])

    def test_delivery_fee_with_free_threshold(self):
        SiteSetting.objects.create(key="delivery_fee", value={"amount": "50"})
        SiteSetting.objects.create(
            key="free_delivery_threshold", value={"amount": "200"}
        )
        paid = self.place_from_cart(items=[{"product_id": self.product.id, "quantity": 1}])
        self.assertEqual(paid.status_code, 201)
        self.assertEqual(paid.data["data"]["delivery_fee"], "50.00")

        free = self.place_from_cart(items=[{"product_id": self.product.id, "quantity": 5}])
        self.assertEqual(free.status_code, 201)
        self.assertEqual(free.data["data"]["delivery_fee"], "0.00")
        self.assertEqual(free.data["data"]["subtotal"], "400.00")

    def test_anonymous_is_unauthorized(self):
        response = APIClient().post(self.orders_url, {}, format="json")
        self.assertEqual(response.status_code, 401)


class CustomerOrderApiTests(CheckoutTestBase):
    def test_list_my_orders(self):
        self.place_from_cart()
        response = self.client.get(self.orders_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total"], 1)
        self.assertIn("pagination", response.data)

    def test_list_filter_by_status(self):
        self.place_from_cart()
        response = self.client.get(self.orders_url, {"status": "SHIPPED"})
        self.assertEqual(response.data["pagination"]["total"], 0)

    def test_detail_returns_timeline(self):
        self.place_from_cart()
        order = Order.objects.get()
        response = self.client.get(f"{self.orders_url}{order.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]["status_history"]), 1)
        self.assertEqual(len(response.data["data"]["items"]), 1)

    def test_cannot_view_another_customers_order(self):
        self.place_from_cart()
        order = Order.objects.get()
        other = APIClient()
        other.force_authenticate(
            user=UserProfile.objects.create(firebase_uid="other-1")
        )
        response = other.get(f"{self.orders_url}{order.id}/")
        self.assertEqual(response.status_code, 404)

    def test_cancel_order_releases_reservation(self):
        self.place_from_cart()
        order = Order.objects.get()
        response = self.client.post(f"{self.orders_url}{order.id}/cancel/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["order_status"], OrderStatus.CANCELLED)

        order.refresh_from_db()
        self.assertEqual(
            order.status_history.last().from_status, OrderStatus.PENDING
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.reserved_quantity, 0)
        self.assertEqual(
            InventoryTransaction.objects.filter(
                reason=InventoryTransaction.Reason.RELEASE
            ).count(),
            1,
        )

    def test_cancel_non_cancellable_order_rejected(self):
        self.place_from_cart()
        order = Order.objects.get()
        order.order_status = OrderStatus.SHIPPED
        order.save(update_fields=["order_status"])
        response = self.client.post(f"{self.orders_url}{order.id}/cancel/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("no longer be cancelled", response.data["message"])

    def test_cannot_cancel_another_customers_order(self):
        self.place_from_cart()
        order = Order.objects.get()
        other = APIClient()
        other.force_authenticate(
            user=UserProfile.objects.create(firebase_uid="other-1")
        )
        response = other.post(f"{self.orders_url}{order.id}/cancel/")
        self.assertEqual(response.status_code, 404)

    def test_cancelled_order_keeps_snapshot(self):
        self.place_from_cart()
        order = Order.objects.get()
        self.client.post(f"{self.orders_url}{order.id}/cancel/")
        order.refresh_from_db()
        self.assertEqual(order.items.get().unit_price, Decimal("80.00"))


class AdminOrderApiTests(CheckoutTestBase):
    def setUp(self):
        super().setUp()
        self.place_from_cart()
        self.manager = AdminUser.objects.create(
            supabase_uid="om-1",
            email="orders@sripon.test",
            role=AdminUser.Role.ORDER_MANAGER,
            active=True,
        )
        self.analyst = AdminUser.objects.create(
            supabase_uid="an-1",
            email="analyst@sripon.test",
            role=AdminUser.Role.ANALYST,
            active=True,
        )
        self.admin_url = "/api/v1/admin/orders/"
        self.order = Order.objects.get()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_list_orders(self):
        self.authenticate(self.manager)
        response = self.client.get(self.admin_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["pagination"]["total"], 1)
        self.assertEqual(response.data["data"][0]["customer"]["name"], "Buyer")

    def test_list_search_and_filters(self):
        self.authenticate(self.manager)
        response = self.client.get(self.admin_url, {"search": "Buyer"})
        self.assertEqual(response.data["pagination"]["total"], 1)
        response = self.client.get(self.admin_url, {"status": "DELIVERED"})
        self.assertEqual(response.data["pagination"]["total"], 0)
        response = self.client.get(
            self.admin_url, {"from": "2026-09-01", "to": "2026-09-30"}
        )
        self.assertEqual(response.data["pagination"]["total"], 1)

    def test_detail(self):
        self.authenticate(self.manager)
        response = self.client.get(f"{self.admin_url}{self.order.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]["items"]), 1)

    def test_status_transition_and_deliver_consumes_stock(self):
        self.authenticate(self.manager)
        for status_value in (
            OrderStatus.CONFIRMED,
            OrderStatus.PROCESSING,
            OrderStatus.PACKED,
            OrderStatus.SHIPPED,
            OrderStatus.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED,
        ):
            response = self.client.patch(
                f"{self.admin_url}{self.order.id}/status/",
                {"status": status_value},
                format="json",
            )
            self.assertEqual(response.status_code, 200)

        self.order.refresh_from_db()
        self.assertEqual(self.order.order_status, OrderStatus.DELIVERED)
        self.assertEqual(self.order.status_history.count(), 7)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 8)
        self.assertEqual(self.product.reserved_quantity, 0)
        self.assertTrue(
            InventoryTransaction.objects.filter(
                reason=InventoryTransaction.Reason.SALE
            ).exists()
        )

    def test_invalid_transition_rejected(self):
        self.authenticate(self.manager)
        response = self.client.patch(
            f"{self.admin_url}{self.order.id}/status/",
            {"status": OrderStatus.DELIVERED},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.order_status, OrderStatus.PENDING)

    def test_admin_cancel_releases_reservation(self):
        self.authenticate(self.manager)
        response = self.client.patch(
            f"{self.admin_url}{self.order.id}/status/",
            {"status": OrderStatus.CANCELLED, "note": "Duplicate"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.reserved_quantity, 0)
        history = self.order.status_history.last()
        self.assertEqual(history.actor_type, OrderStatusHistory.ActorType.ADMIN)
        self.assertEqual(history.note, "Duplicate")

    def test_payment_status_update(self):
        self.authenticate(self.manager)
        response = self.client.patch(
            f"{self.admin_url}{self.order.id}/payment-status/",
            {"payment_status": PaymentStatus.PAID},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PAID)

    def test_analyst_cannot_manage_orders(self):
        self.authenticate(self.analyst)
        response = self.client.get(self.admin_url)
        self.assertEqual(response.status_code, 403)

    def test_anonymous_admin_access_is_unauthorized(self):
        response = APIClient().get(self.admin_url)
        self.assertEqual(response.status_code, 401)