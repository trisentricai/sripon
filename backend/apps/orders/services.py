"""Checkout and order lifecycle services.

The backend is authoritative: prices, taxes, delivery fees, coupons and stock
availability are all recomputed here. Client-supplied totals are never used.
"""
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import F

from apps.cart.services import get_or_create_cart
from apps.coupons.models import CouponUsage
from apps.coupons.services import CouponError, validate_coupon
from apps.products.models import InventoryTransaction, Product
from apps.settings.models import SiteSetting
from apps.users.models import Address

from .constants import CANCELLABLE_STATUSES, OrderStatus, can_transition
from .models import Order, OrderItem, OrderStatusHistory
from .utils import generate_order_number

ZERO = Decimal("0.00")


class OrderError(Exception):
    pass


def money(value) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def get_setting(key, default=None):
    row = SiteSetting.objects.filter(key=key).first()
    return default if row is None else row.value


def _amount(key, default) -> Decimal:
    value = get_setting(key)
    if value is None:
        return money(default)
    if isinstance(value, dict):
        value = value.get("amount", value.get("value", default))
    try:
        return money(str(value))
    except Exception:
        return money(default)


def _min_order_value() -> Decimal:
    return _amount("min_order_value", 0)


def delivery_fee_for(subtotal_after_discount: Decimal) -> Decimal:
    """Delivery fee, waived when the order crosses the free-delivery gate."""
    fee = _amount("delivery_fee", 0)
    if fee <= 0:
        return ZERO
    threshold = get_setting("free_delivery_threshold")
    if threshold is not None:
        if isinstance(threshold, dict):
            threshold = threshold.get("amount", threshold.get("value"))
        try:
            if Decimal(str(threshold)) > 0 and subtotal_after_discount >= Decimal(
                str(threshold)
            ):
                return ZERO
        except Exception:
            pass
    return fee


def snapshot_address(address: Address) -> dict:
    return {
        "full_name": address.full_name,
        "phone": address.phone,
        "address_line_1": address.address_line_1,
        "address_line_2": address.address_line_2,
        "city": address.city,
        "district": address.district,
        "state": address.state,
        "pincode": address.pincode,
        "landmark": address.landmark,
    }


def validate_product_for_order(product: Product, quantity: int) -> None:
    if not product.is_active:
        raise OrderError(f"{product.name} is no longer available.")
    if quantity < 1:
        raise OrderError("Quantity must be at least 1.")
    minimum = max(int(product.minimum_order_quantity or 1), 1)
    if quantity < minimum:
        raise OrderError(
            f"Minimum order quantity for {product.name} is {minimum}."
        )
    maximum = product.maximum_order_quantity
    if maximum and quantity > maximum:
        raise OrderError(f"Maximum order quantity for {product.name} is {maximum}.")
    available = product.available_quantity
    if quantity > available:
        if available <= 0:
            raise OrderError(f"{product.name} is out of stock.")
        raise OrderError(f"Only {available} of {product.name} left in stock.")


def _resolve_lines(customer, payload_items):
    """Return (lines, cart_or_None). Explicit items bypass the cart."""
    if payload_items is not None:
        lines = []
        for entry in payload_items:
            product = Product.objects.filter(pk=entry["product_id"]).first()
            if product is None:
                raise OrderError("One or more products are not available.")
            validate_product_for_order(product, entry["quantity"])
            lines.append({"product": product, "quantity": entry["quantity"]})
        return lines, None

    cart = get_or_create_cart(customer)
    items = list(cart.items.select_related("product"))
    if not items:
        raise OrderError("Your cart is empty.")
    for item in items:
        validate_product_for_order(item.product, item.quantity)
    return [{"product": item.product, "quantity": item.quantity} for item in items], cart


def _compute(lines):
    """Server-computed totals and immutable line snapshots."""
    subtotal = ZERO
    tax_total = ZERO
    order_items = []
    for entry in lines:
        product = entry["product"]
        quantity = entry["quantity"]
        unit_price = product.effective_price
        line_total = money(unit_price * quantity)
        line_tax = money(product.tax_amount * quantity)
        subtotal += line_total
        tax_total += line_tax
        order_items.append(
            {
                "product": product,
                "name": product.name,
                "sku": product.sku,
                "unit_price": unit_price,
                "discount": product.discount_amount,
                "tax_percent": product.tax,
                "quantity": quantity,
                "final_price": unit_price,
                "line_total": line_total,
            }
        )
    return money(subtotal), money(tax_total), order_items


def _generate_unique_order_number() -> str:
    for _ in range(10):
        candidate = generate_order_number()
        if not Order.objects.filter(order_number=candidate).exists():
            return candidate
    raise OrderError("Could not generate a unique order number.")


def place_order(
    customer,
    address: Address,
    *,
    coupon_code: str = "",
    items=None,
    notes: str = "",
) -> Order:
    """Validate, price and create an order, reserving stock atomically."""
    with transaction.atomic():
        lines, cart = _resolve_lines(customer, items)

        subtotal, tax_total, order_items = _compute(lines)
        minimum = _min_order_value()
        if minimum and subtotal < minimum:
            raise OrderError(f"Minimum order value is {minimum}.")

        discount = ZERO
        coupon = None
        if coupon_code:
            try:
                coupon, discount = validate_coupon(coupon_code, customer, subtotal)
                discount = money(discount)
            except CouponError as exc:
                raise OrderError(str(exc))

        delivery_fee = delivery_fee_for(subtotal - discount)
        total = money(subtotal - discount + tax_total + delivery_fee)

        order = Order.objects.create(
            order_number=_generate_unique_order_number(),
            customer=customer,
            address_snapshot=snapshot_address(address),
            subtotal=subtotal,
            discount=discount,
            tax=tax_total,
            delivery_fee=delivery_fee,
            coupon_code=coupon.code if coupon else "",
            total=total,
            notes=notes or "",
        )
        OrderItem.objects.bulk_create(
            [OrderItem(order=order, **data) for data in order_items]
        )
        OrderStatusHistory.objects.create(
            order=order,
            to_status=OrderStatus.PENDING,
            note="Order placed.",
        )

        for entry in order_items:
            product = entry["product"]
            Product.objects.filter(pk=product.pk).update(
                reserved_quantity=F("reserved_quantity") + entry["quantity"]
            )
            InventoryTransaction.objects.create(
                product=product,
                quantity_change=-entry["quantity"],
                reason=InventoryTransaction.Reason.RESERVATION,
                reference=order.order_number,
            )

        if coupon is not None:
            CouponUsage.objects.create(
                coupon=coupon,
                customer=customer,
                order=order,
                applied_discount=discount,
            )

        if cart is not None:
            cart.items.all().delete()

    return (
        Order.objects.select_related("customer")
        .prefetch_related(
            "items",
            "status_history",
        )
        .get(pk=order.pk)
    )


def cancel_order(order: Order, actor=None) -> Order:
    """Customer/self-service cancellation; releases reserved stock."""
    if order.order_status not in CANCELLABLE_STATUSES:
        raise OrderError("This order can no longer be cancelled.")
    with transaction.atomic():
        previous = order.order_status
        order.order_status = OrderStatus.CANCELLED
        order.save(update_fields=["order_status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order,
            from_status=previous,
            to_status=OrderStatus.CANCELLED,
            actor_type=OrderStatusHistory.ActorType.CUSTOMER
            if actor is None
            else OrderStatusHistory.ActorType.ADMIN,
            actor=str(actor or ""),
            note="Order cancelled.",
        )
        for item in order.items.all():
            _release_reservation(order, item.product_id, item.quantity)
    return order


def _release_reservation(order: Order, product_id, quantity: int) -> None:
    if product_id is None:
        return
    Product.objects.filter(pk=product_id).update(
        reserved_quantity=F("reserved_quantity") - quantity
    )
    InventoryTransaction.objects.create(
        product_id=product_id,
        quantity_change=+quantity,
        reason=InventoryTransaction.Reason.RELEASE,
        reference=order.order_number,
    )


def transition_order_status(
    order: Order, target_status: str, note: str = "", actor=None
) -> Order:
    """Admin-driven status change following the transition matrix.

    Cancelling releases reservations; delivering consumes them (a sale).
    """
    if not can_transition(order.order_status, target_status):
        raise OrderError(
            f"Cannot transition from {order.order_status} to {target_status}."
        )
    with transaction.atomic():
        previous = order.order_status
        order.order_status = target_status
        order.save(update_fields=["order_status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order,
            from_status=previous,
            to_status=target_status,
            actor_type=OrderStatusHistory.ActorType.ADMIN,
            actor=str(actor or ""),
            note=note or "",
        )

        if target_status == OrderStatus.CANCELLED:
            for item in order.items.all():
                _release_reservation(order, item.product_id, item.quantity)

        if target_status == OrderStatus.DELIVERED:
            for item in order.items.select_related("product").all():
                if item.product_id is None:
                    continue
                Product.objects.filter(pk=item.product_id).update(
                    stock_quantity=F("stock_quantity") - item.quantity,
                    reserved_quantity=F("reserved_quantity") - item.quantity,
                )
                InventoryTransaction.objects.create(
                    product_id=item.product_id,
                    quantity_change=-item.quantity,
                    reason=InventoryTransaction.Reason.SALE,
                    reference=order.order_number,
                )
        order.refresh_from_db()
    return order


def update_payment_status(order: Order, payment_status: str) -> Order:
    if payment_status not in dict(
        Order._meta.get_field("payment_status").choices
    ):
        raise OrderError("Invalid payment status.")
    order.payment_status = payment_status
    order.save(update_fields=["payment_status", "updated_at"])
    return order