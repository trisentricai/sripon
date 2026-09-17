import re
from decimal import Decimal

from django.db import IntegrityError
from django.test import TestCase

from apps.orders.constants import (
    CANCELLABLE_STATUSES,
    OrderStatus,
    can_transition,
)
from apps.orders.models import Order
from apps.orders.utils import generate_order_number
from apps.users.models import UserProfile


class OrderConstantsTests(TestCase):
    def test_can_transition_matrix(self):
        self.assertTrue(can_transition(OrderStatus.PENDING, OrderStatus.CONFIRMED))
        self.assertTrue(can_transition(OrderStatus.PENDING, OrderStatus.CANCELLED))
        self.assertFalse(can_transition(OrderStatus.PENDING, OrderStatus.DELIVERED))
        self.assertFalse(can_transition(OrderStatus.DELIVERED, OrderStatus.CANCELLED))
        self.assertTrue(
            can_transition(OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED)
        )

    def test_terminated_states_have_no_transitions(self):
        self.assertEqual(
            can_transition(OrderStatus.CANCELLED, OrderStatus.PENDING), False
        )
        self.assertEqual(
            can_transition(OrderStatus.RETURNED, OrderStatus.DELIVERED), False
        )

    def test_cancellable_statuses(self):
        self.assertIn(OrderStatus.PENDING, CANCELLABLE_STATUSES)
        self.assertIn(OrderStatus.CONFIRMED, CANCELLABLE_STATUSES)
        self.assertNotIn(OrderStatus.SHIPPED, CANCELLABLE_STATUSES)

    def test_generate_order_number_format(self):
        order_number = generate_order_number()
        self.assertRegex(order_number, r"^SP-\d{8}-\d{6}$")


class OrderModelTests(TestCase):
    def setUp(self):
        self.customer = UserProfile.objects.create(
            firebase_uid="fire-1", name="Buyer", email="buyer@sripon.in"
        )

    def test_order_fields_stored(self):
        order = Order.objects.create(
            order_number="SP-20240101-000001",
            customer=self.customer,
            address_snapshot={"city": "Chennai", "pincode": "600001"},
            subtotal=Decimal("100"),
            discount=Decimal("10"),
            tax=Decimal("5"),
            delivery_fee=Decimal("0"),
            total=Decimal("95"),
            coupon_code="FEST10",
        )
        self.assertEqual(str(order), "SP-20240101-000001")
        self.assertEqual(order.address_snapshot["city"], "Chennai")
        self.assertEqual(order.payment_status, "PENDING")

    def test_order_number_unique(self):
        Order.objects.create(
            order_number="SP-20240101-000002",
            customer=self.customer,
            address_snapshot={},
            subtotal=Decimal("0"),
            total=Decimal("0"),
        )
        with self.assertRaises(IntegrityError):
            Order.objects.create(
                order_number="SP-20240101-000002",
                customer=self.customer,
                address_snapshot={},
                subtotal=Decimal("0"),
                total=Decimal("0"),
            )