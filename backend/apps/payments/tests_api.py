from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.models import Order, OrderStatusHistory
from apps.payments.models import Payment
from apps.payments.providers import MockProvider, get_provider
from apps.users.models import UserProfile


def _order_number(seed):
    return f"SP-20260917-{seed:>06}"


def _create_order(customer, total=Decimal("199.99"), status=OrderStatus.PENDING):
    return Order.objects.create(
        order_number=_order_number(Order.objects.count() + 100),
        customer=customer,
        address_snapshot={},
        subtotal=total,
        total=total,
        order_status=status,
    )


class PaymentApiTests(TestCase):
    def setUp(self):
        from django.core.cache import cache

        cache.clear()
        self.customer = UserProfile.objects.create(
            firebase_uid="pd-1", name="Payer", email="pd1@sripon.in"
        )
        self.other = UserProfile.objects.create(
            firebase_uid="pd-2", name="Other", email="pd2@sripon.in"
        )
        self.order = _create_order(self.customer)
        self.client = APIClient()
        self.client.force_authenticate(self.customer)
        self.provider = MockProvider()

    def sign(self, payload, payment):
        payload["signature"] = self.provider.signature(payment)
        return payload

    def initiate(self):
        response = self.client.post(
            reverse("v1:payment-initiate", args=[self.order.order_number])
        )
        return response

    def test_initiate_returns_provider_payload(self):
        response = self.initiate()
        self.assertEqual(response.status_code, 201)
        data = response.data["data"]
        payment = Payment.objects.get(payment_id=data["payment_id"])
        self.assertEqual(payment.status, Payment.Status.INITIATED)
        self.assertEqual(payment.amount, Decimal("199.99"))
        self.assertEqual(payment.order_id, self.order.pk)
        self.assertEqual(data["initiation"]["gateway"], "MOCK")
        self.assertIn("signature", data["initiation"])
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PENDING)

    def test_initiate_rejects_paid_order(self):
        Payment.objects.create(
            order=self.order, amount=self.order.total, status=Payment.Status.SUCCESS
        )
        self.order.payment_status = PaymentStatus.PAID
        self.order.save()
        response = self.initiate()
        self.assertEqual(response.status_code, 400)

    def test_initiate_rejects_cancelled_order(self):
        self.order.order_status = OrderStatus.CANCELLED
        self.order.save()
        response = self.initiate()
        self.assertEqual(response.status_code, 400)

    def test_initiate_rejects_foreign_order(self):
        other_order = _create_order(self.other)
        response = self.client.post(
            reverse("v1:payment-initiate", args=[other_order.order_number])
        )
        self.assertEqual(response.status_code, 404)

    def test_reinitiate_creates_new_payment(self):
        first = self.initiate()
        second = self.initiate()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(
            first.data["data"]["payment_id"], second.data["data"]["payment_id"]
        )
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 2)

    def test_status_lookup(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        url = reverse("v1:payment-status", args=[payment.payment_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["order_number"], self.order.order_number)
        self.assertEqual(response.data["data"]["amount"], "199.99")

    def test_status_lookup_rejects_foreign_payment(self):
        payment = Payment.objects.create(order=_create_order(self.other), amount=10)
        response = self.client.get(
            reverse("v1:payment-status", args=[payment.payment_id])
        )
        self.assertEqual(response.status_code, 404)

    def test_webhook_success_flips_order_to_paid(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "199.99"}, payment
        )
        response = self.client.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["status"], "SUCCESS")
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertIsNotNone(payment.completed_at)
        self.assertEqual(payment.webhook_payload["amount"], "199.99")
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PAID)
        self.assertEqual(
            OrderStatusHistory.objects.filter(
                order=self.order, actor_type=OrderStatusHistory.ActorType.SYSTEM
            ).count(),
            1,
        )

    def test_webhook_is_anonymous(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "199.99"}, payment
        )
        anonymous = APIClient()
        response = anonymous.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)

    def test_webhook_duplicate_delivery_is_idempotent(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "199.99"}, payment
        )
        url = reverse("v1:payment-webhook", args=["MOCK"])
        for _ in range(2):
            self.assertEqual(
                self.client.post(url, payload, format="json").status_code, 200
            )
        self.assertEqual(
            Payment.objects.filter(status=Payment.Status.SUCCESS).count(), 1
        )
        self.assertEqual(
            OrderStatusHistory.objects.filter(order=self.order).count(), 1
        )

    def test_webhook_bad_signature_rejected(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = {
            "payment_id": str(payment.payment_id),
            "amount": "199.99",
            "signature": "deadbeef",
        }
        response = self.client.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 400)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PENDING)

    def test_webhook_amount_mismatch_rejected(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "1.00"}, payment
        )
        response = self.client.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 400)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.PENDING)

    def test_webhook_failed_payment_sets_failed(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "199.99", "status": "FAILED"},
            payment,
        )
        response = self.client.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.FAILED)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PENDING)

    def test_webhook_unknown_payment_rejected(self):
        payload = {
            "payment_id": str(self.order.pk),
            "amount": "199.99",
            "signature": "x",
        }
        response = self.client.post(
            reverse("v1:payment-webhook", args=["MOCK"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_webhook_unknown_provider_rejected(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        payload = self.sign(
            {"payment_id": str(payment.payment_id), "amount": "199.99"}, payment
        )
        response = self.client.post(
            reverse("v1:payment-webhook", args=["NOPE"]), payload, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_mock_confirm_dev_only(self):
        payment = Payment.objects.create(order=self.order, amount=self.order.total)
        response = self.client.post(
            reverse("v1:payment-mock-success"),
            {"payment_id": str(payment.payment_id)},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["status"], "SUCCESS")
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, PaymentStatus.PAID)

    def test_mock_confirm_rejects_foreign_payment(self):
        payment = Payment.objects.create(order=_create_order(self.other), amount=10)
        response = self.client.post(
            reverse("v1:payment-mock-success"),
            {"payment_id": str(payment.payment_id)},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_mock_confirm_requires_auth(self):
        anonymous = APIClient()
        response = anonymous.post(reverse("v1:payment-mock-success"), {}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_get_provider_registry(self):
        self.assertIsInstance(get_provider("MOCK"), MockProvider)
        with self.assertRaises(Exception):
            get_provider("BOGUS")