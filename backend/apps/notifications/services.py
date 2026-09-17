"""Notification dispatch services (Phase 14).

Handles two channels:

- In-app: a ``Notification`` row read by the customer API.
- Push (FCM): fire-and-forget delivery to the customer's registered device
  tokens, dispatched through the Firebase Admin SDK.

Delivery attempts are recorded on ``NotificationEventLog`` so failures are
observable without bubbling exceptions into the request/order lifecycle.
"""
import logging

from django.utils import timezone

from .models import Notification, NotificationEventLog

logger = logging.getLogger("apps.notifications")


def create_in_app_notification(
    *,
    customer,
    title: str,
    body: str = "",
    ntype: str = Notification.Type.SYSTEM,
    payload: dict | None = None,
) -> Notification:
    """Persist a customer-facing in-app notification."""
    return Notification.objects.create(
        customer=customer,
        title=title,
        body=body,
        type=ntype,
        payload=payload or {},
    )


def _send_fcm_to_token(token, title: str, body: str, payload: dict) -> None:
    """Best-effort FCM send to a single device token. Raises on failure."""
    from firebase_admin import messaging

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data={str(k): str(v) for k, v in payload.items()},
        token=token,
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(sound="default")
            )
        ),
    )
    messaging.send(message)


def dispatch_push(
    *,
    customer,
    title: str,
    body: str = "",
    payload: dict | None = None,
    event: str = "NOTIFICATION",
):
    """Fan out an FCM push to a customer's active device tokens.

    Returns the number of successfully dispatched tokens. Failures are logged
    and recorded on the event log but never raised to callers.
    """
    from apps.users.models import DeviceToken

    payload = payload or {}
    tokens = list(
        DeviceToken.objects.filter(customer=customer, active=True).values_list(
            "token", flat=True
        )
    )
    if not tokens:
        return 0

    dispatched = 0
    for token in tokens:
        try:
            _send_fcm_to_token(token, title, body, payload)
            dispatched += 1
        except Exception as exc:  # noqa: BLE001 - per-token best effort
            logger.warning("FCM dispatch failed: %s", exc)
            NotificationEventLog.objects.create(
                event=event,
                recipient_type=NotificationEventLog.RecipientType.CUSTOMER,
                channel=NotificationEventLog.Channel.FCM,
                status="FAILED",
                error=str(exc),
            )

    if dispatched:
        NotificationEventLog.objects.create(
            event=event,
            recipient_type=NotificationEventLog.RecipientType.CUSTOMER,
            channel=NotificationEventLog.Channel.FCM,
            status="SUCCESS",
        )
    return dispatched


def send_customer_notification(
    *,
    customer,
    title: str,
    body: str = "",
    ntype: str = Notification.Type.SYSTEM,
    payload: dict | None = None,
    push: bool = True,
    event: str = "NOTIFICATION",
) -> Notification:
    """Convenience: create the in-app row and optionally fan out a push."""
    notification = create_in_app_notification(
        customer=customer,
        title=title,
        body=body,
        ntype=ntype,
        payload=payload,
    )
    if push:
        dispatch_push(
            customer=customer,
            title=title,
            body=body,
            payload=payload or {},
            event=event,
        )
    return notification


def send_order_notification(
    *, customer, title: str, body: str = "", order_id: int | None = None,
    ntype: str = Notification.Type.ORDER, event: str = "ORDER",
) -> Notification:
    """Send an order-related notification (in-app + push)."""
    return send_customer_notification(
        customer=customer,
        title=title,
        body=body,
        ntype=ntype,
        payload={"order_id": order_id},
        push=True,
        event=event,
    )


def mark_read(notification, customer) -> bool:
    """Mark a notification as read (idempotent). Returns True if changed."""
    if notification.customer_id != customer.pk:
        return False
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at"])
    return True