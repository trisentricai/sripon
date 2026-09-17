"""Cart and wishlist domain logic.

Prices are always recomputed here from the current product rows; client
totals are never trusted.
"""
from decimal import Decimal

from django.db import transaction

from apps.products.models import Product

from .models import Cart, CartItem, Wishlist, WishlistItem

ZERO = Decimal("0.00")
CURRENCY = "INR"


class CartError(Exception):
    """Raised for stock/quantity/business-rule violations."""


def money(value) -> Decimal:
    return Decimal(value).quantize(Decimal("0.01"))


def get_or_create_cart(customer) -> Cart:
    cart, _ = Cart.objects.get_or_create(customer=customer)
    return cart


def get_or_create_wishlist(customer) -> Wishlist:
    wishlist, _ = Wishlist.objects.get_or_create(customer=customer)
    return wishlist


def validate_quantity(product: Product, quantity: int) -> None:
    if quantity < 1:
        raise CartError("Quantity must be at least 1.")
    if not product.is_active:
        raise CartError(f"{product.name} is no longer available.")

    minimum = max(int(product.minimum_order_quantity or 1), 1)
    if quantity < minimum:
        raise CartError(f"Minimum order quantity for {product.name} is {minimum}.")

    maximum = product.maximum_order_quantity
    if maximum and quantity > maximum:
        raise CartError(f"Maximum order quantity for {product.name} is {maximum}.")

    available = product.available_quantity
    if quantity > available:
        if available == 0:
            raise CartError(f"{product.name} is out of stock.")
        raise CartError(f"Only {available} of {product.name} left in stock.")


def resolve_product(product_id) -> Product:
    product = Product.objects.filter(pk=product_id).first()
    if product is None:
        raise CartError("Product not found.")
    return product


def add_item(cart: Cart, product: Product, quantity: int = 1) -> CartItem:
    if quantity is None:
        quantity = 1
    with transaction.atomic():
        item = CartItem.objects.filter(cart=cart, product=product).first()
        new_quantity = (item.quantity if item else 0) + quantity
        validate_quantity(product, new_quantity)
        if item is None:
            item = CartItem.objects.create(
                cart=cart, product=product, quantity=new_quantity
            )
        else:
            item.quantity = new_quantity
            item.save(update_fields=["quantity"])
    return item


def update_item(cart: Cart, item_id: int, quantity: int) -> CartItem | None:
    item = CartItem.objects.filter(pk=item_id, cart=cart).first()
    if item is None:
        raise CartError("Cart item not found.")
    if quantity < 1:
        item.delete()
        return None
    validate_quantity(item.product, quantity)
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return item


def remove_item(cart: Cart, item_id: int) -> bool:
    deleted, _ = CartItem.objects.filter(pk=item_id, cart=cart).delete()
    return bool(deleted)


def clear_cart(cart: Cart) -> int:
    deleted, _ = cart.items.all().delete()
    return deleted


def merge_items(cart: Cart, items) -> dict:
    """Fold a guest cart payload into the customer's cart."""
    merged = 0
    skipped = []
    for entry in items:
        product_id = entry.get("product_id")
        quantity = entry.get("quantity", 1) or 1
        product = Product.objects.filter(pk=product_id).first()
        if product is None:
            skipped.append({"product_id": product_id, "reason": "Product not found."})
            continue
        try:
            add_item(cart, product, quantity)
        except CartError as exc:
            skipped.append({"product_id": product_id, "reason": str(exc)})
            continue
        merged += 1
    return {"merged": merged, "skipped": skipped}


def item_line(item: CartItem) -> dict:
    product = item.product
    unit_price = product.effective_price
    mrp = product.mrp if product.mrp and product.mrp > unit_price else unit_price
    line_total = money(unit_price * item.quantity)
    mrp_line_total = money(mrp * item.quantity)
    tax_total = money(product.tax_amount * item.quantity)
    return {
        "line_total": line_total,
        "mrp_line_total": mrp_line_total,
        "discount_total": mrp_line_total - line_total,
        "tax_total": tax_total,
    }


def cart_summary(cart: Cart) -> dict:
    """Server-recomputed totals for the cart envelope."""
    items = list(cart.items.select_related("product"))
    subtotal = ZERO
    mrp_total = ZERO
    tax_total = ZERO
    item_count = 0

    for item in items:
        line = item_line(item)
        subtotal += line["line_total"]
        mrp_total += line["mrp_line_total"]
        tax_total += line["tax_total"]
        item_count += item.quantity

    discount_total = mrp_total - subtotal
    return {
        "item_count": item_count,
        "line_count": len(items),
        "subtotal": money(subtotal),
        "mrp_total": money(mrp_total),
        "discount_total": money(discount_total if discount_total > 0 else ZERO),
        "tax_total": money(tax_total),
        "total": money(subtotal + tax_total),
        "currency": CURRENCY,
    }


def add_to_wishlist(wishlist: Wishlist, product: Product) -> WishlistItem:
    item, _ = WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
    return item


def remove_from_wishlist(wishlist: Wishlist, product_id: int) -> bool:
    deleted, _ = WishlistItem.objects.filter(
        wishlist=wishlist, product_id=product_id
    ).delete()
    return bool(deleted)


def move_to_cart(wishlist: Wishlist, cart: Cart, product: Product, quantity: int = 1):
    """Validate into the cart first, then drop the wishlist entry."""
    item = add_item(cart, product, quantity)
    WishlistItem.objects.filter(wishlist=wishlist, product=product).delete()
    return item
