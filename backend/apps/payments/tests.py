from decimal import Decimal

from django.test import TestCase

from apps.orders.models import Order
from apps.payments.models import Payment
from apps.users.models import UserProfile


class PaymentModelTests(TestCase):
    def setUp(self):
        customer = UserProfile.objects.create(
            firebase_uid="pay-1", name="Payer", email="p@sripon.in"
        )
        self.order = Order.objects.create(
            order_number="SP-20240101-000020",
            customer=customer,
            address_snapshot={},
            subtotal=Decimal("100"),
            total=Decimal("100"),
        )

    def test_defaults_and_uuid_pk(self):
        payment = Payment.objects.create(order=self.order, amount=Decimal("100"))
        self.assertIsNotNone(payment.payment_id)
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.currency, "INR")
        self.assertEqual(payment.provider, "MOCK")

    def test_mark_success(self):
        payment = Payment.objects.create(order=self.order, amount=Decimal("100"))
        payment.mark_success(provider_ref="ref-123")
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(payment.provider_ref, "ref-123")
        self.assertIsNotNone(payment.completed_at)