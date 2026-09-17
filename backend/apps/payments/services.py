"""Payment lifecycle services (Phase 8).

Orders are flipped to wallet/PENDING until a verified callback confirms the
charge. Success handling is idempotent and transactional so duplicate webhook
deliveries can never double-charge or double-apply.
"""
from django.db import transaction

from apps.orders.constants import OrderStatus, PaymentStatus
from apps.orders.models import Order, OrderStatusHistory

from .models import Payment
from .providers import get_provider


class PaymentError(Exception):
    pass


def initiate_payment(order: Order) -> Payment:
    """Create an INITIATED payment and return its provider payload."""
    if order.order_status in (OrderStatus.CANCELLED, OrderStatus.RETURNED):
        raise PaymentError("Order cannot be paid in its current state.")
    if order.payment_status == PaymentStatus.PAID:
        raise PaymentError("Order is already paid.")
    if Payment.objects.filter(
        order=order, status=Payment.Status.SUCCESS
    ).exists():
        raise PaymentError("Order already has a successful payment.")

    provider = get_provider()
    with transaction.atomic():
        payment = Payment.objects.create(
            order=order,
            provider=provider.name,
            amount=order.total,
            currency="INR",
            status=Payment.Status.INITIATED,
        )
        payload = provider.build_initiation(payment)
        payment.initiation_payload = payload
        payment.save(update_fields=["initiation_payload", "updated_at"])
    return payment


def apply_success(payment: Payment, provider_ref: str = "", payload: dict | None = None):
    """Idempotently mark a payment SUCCESS and flip the order to PAID.

    Safe under concurrent webhook replays: a second call returns early, and the
    unique ``(order, status=SUCCESS)`` constraint backs single-settlement.
    """
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status == Payment.Status.SUCCESS:
            order = payment.order
            if order.payment_status != PaymentStatus.PAID:
                Order.objects.filter(pk=order.pk).update(
                    payment_status=PaymentStatus.PAID
                )
            return payment

        payment.mark_success(provider_ref=provider_ref)
        if payload:
            payment.webhook_payload = dict(payload)
            payment.save(update_fields=["webhook_payload", "updated_at"])

        Order.objects.filter(pk=payment.order_id).update(
            payment_status=PaymentStatus.PAID
        )
        OrderStatusHistory.objects.create(
            order_id=payment.order_id,
            to_status=payment.order.order_status,
            actor_type=OrderStatusHistory.ActorType.SYSTEM,
            note="Payment received.",
        )
    return payment


def mark_failed(payment: Payment, provider_ref: str = "") -> Payment:
    if payment.status == Payment.Status.SUCCESS:
        return payment
    payment.status = Payment.Status.FAILED
    payment.provider_ref = provider_ref or payment.provider_ref
    payment.save(update_fields=["status", "provider_ref", "updated_at"])
    return payment


def handle_callback(provider_name: str, payload: dict, headers=None) -> Payment:
    """Verify provider callback, then settle or fail the payment."""
    provider = get_provider(provider_name)
    verified = provider.verify_callback(payload or {}, headers or {})
    payment = verified["payment"]

    if verified["status"] == Payment.Status.SUCCESS:
        return apply_success(payment, verified["provider_ref"], payload=payload)
    if verified["status"] == Payment.Status.FAILED:
        return mark_failed(payment, verified["provider_ref"])
    return payment


def mock_confirm(payment: Payment) -> Payment:
    """Development-only direct confirmation (no provider round-trip)."""
    return apply_success(payment, provider_ref=str(payment.payment_id))