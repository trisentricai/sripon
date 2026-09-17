from django.db import models

from apps.common.models import TimeStampedModel
from apps.products.models import Product
from apps.users.models import UserProfile


class Cart(TimeStampedModel):
    """Server-side cart; exactly one per customer. Guest carts are merged on
    login by the cart service."""

    customer = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="cart",
    )

    def __str__(self):
        return f"Cart for {self.customer}"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"],
                name="uniq_cart_product",
            )
        ]

    def __str__(self):
        return f"{self.product.sku} x {self.quantity}"


class Wishlist(TimeStampedModel):
    """Saved-for-later list; exactly one per customer."""

    customer = models.OneToOneField(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="wishlist",
    )

    def __str__(self):
        return f"Wishlist for {self.customer}"


class WishlistItem(models.Model):
    wishlist = models.ForeignKey(
        Wishlist, on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="wishlist_items"
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-added_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["wishlist", "product"],
                name="uniq_wishlist_product",
            )
        ]

    def __str__(self):
        return f"{self.product.sku} saved"