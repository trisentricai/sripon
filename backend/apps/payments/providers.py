"""Provider-independent payment gateway adapters.

A ``PaymentProvider`` builds the client-facing initiation payload and verifies
the server-side callback. Select the active gateway with ``PAYMENT_PROVIDER``
(backend env only). Real gateways (PhonePe/Razorpay/Stripe) slot in behind the
same protocol; the MOCK implementation ships signed callbacks so the full flow
is testable end-to-end.
"""
import hashlib
import hmac
from decimal import Decimal

from django.conf import settings

from .models import Payment


class PaymentProviderError(Exception):
    pass


class CallbackVerificationError(PaymentProviderError):
    pass


class PaymentProvider:
    name = "BASE"

    def build_initiation(self, payment: Payment) -> dict:
        raise NotImplementedError

    def verify_callback(self, payload: dict, headers) -> dict:
        """Return a normalised ``{payment, status, provider_ref}`` mapping."""
        raise NotImplementedError


class MockProvider(PaymentProvider):
    """HMAC-signed mock gateway for development and automated tests."""

    name = "MOCK"

    def _secret(self) -> str:
        return settings.PAYMENT.get("MOCK_SECRET", "mock-secret-dev")

    def signature(self, payment: Payment) -> str:
        message = f"{payment.payment_id}{str(payment.amount)}".encode()
        return hmac.new(
            self._secret().encode(), message, hashlib.sha256
        ).hexdigest()

    def build_initiation(self, payment: Payment) -> dict:
        return {
            "gateway": self.name,
            "payment_id": str(payment.payment_id),
            "order": payment.order.order_number,
            "amount": str(payment.amount),
            "currency": payment.currency,
            "signature": self.signature(payment),
        }

    def verify_callback(self, payload: dict, headers) -> dict:
        payment_id = payload.get("payment_id") or headers.get("X-Payment-Id")
        if not payment_id:
            raise CallbackVerificationError("Missing payment id.")

        payment = Payment.objects.filter(payment_id=payment_id).first()
        if payment is None:
            raise CallbackVerificationError("Unknown payment.")

        received = payload.get("signature") or headers.get("X-Payment-Signature")
        expected = self.signature(payment)
        if not received or not hmac.compare_digest(str(received), str(expected)):
            raise CallbackVerificationError("Invalid signature.")

        amount = payload.get("amount")
        if amount is not None and Decimal(str(amount)) != payment.amount:
            raise CallbackVerificationError("Amount mismatch.")

        status = str(payload.get("status") or "SUCCESS").upper()
        return {
            "payment": payment,
            "status": status,
            "provider_ref": str(payload.get("provider_ref") or payment.payment_id),
        }


def get_provider(name: str | None = None) -> PaymentProvider:
    name = (name or settings.PAYMENT.get("PROVIDER", "MOCK")).upper()
    registry = {cls.name: cls for cls in PaymentProvider.__subclasses__()}
    provider_cls = registry.get(name)
    if provider_cls is None:
        raise PaymentProviderError(f"Unsupported payment provider: {name}")
    return provider_cls()