from decimal import Decimal

from django.db import models

from apps.categories.models import Category
from apps.common.models import TimeStampedModel
from apps.users.models import AdminUser


class Product(TimeStampedModel):
    """Cracker/fireworks product. The backend is the source of truth for
    pricing and availability."""

    category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="products",
    )
    sku = models.CharField(max_length=64, unique=True, db_index=True)
    product_code = models.CharField(max_length=64, blank=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=280, unique=True, db_index=True)
    brand = models.CharField(max_length=128, blank=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)

    mrp = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    tax = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))

    stock_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    minimum_order_quantity = models.PositiveIntegerField(default=1)
    maximum_order_quantity = models.PositiveIntegerField(null=True, blank=True)
    weight = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=20, default="box")

    specifications = models.JSONField(default=dict, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    meta = models.JSONField(default=dict, blank=True)

    is_featured = models.BooleanField(default=False, db_index=True)
    is_best_seller = models.BooleanField(default=False, db_index=True)
    is_new = models.BooleanField(default=False, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["price"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    @property
    def effective_price(self) -> Decimal:
        if self.discount_price is not None and self.discount_price < self.price:
            return self.discount_price
        return self.price

    @property
    def discount_amount(self) -> Decimal:
        base = self.mrp if self.mrp > self.price else self.price
        return base - self.effective_price if base > 0 else Decimal("0")

    @property
    def discount_percent(self) -> Decimal:
        base = self.mrp if self.mrp > self.price else self.price
        if base <= 0:
            return Decimal("0")
        return (self.discount_amount / base * 100).quantize(Decimal("0.01"))

    @property
    def available_quantity(self) -> int:
        return max(int(self.stock_quantity) - int(self.reserved_quantity), 0)

    @property
    def in_stock(self) -> bool:
        return self.available_quantity > 0

    @property
    def tax_amount(self) -> Decimal:
        return (self.effective_price * self.tax / 100).quantize(Decimal("0.01"))


class ProductImage(models.Model):
    """Cloudinary-backed image attached to a product."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )
    public_id = models.CharField(max_length=200)
    secure_url = models.CharField(max_length=500)
    alt_text = models.CharField(max_length=255, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.product.name} image ({self.public_id})"


class Inventory(models.Model):
    """Operational stock ledger for a product (mirrors Product.stock)."""

    product = models.OneToOneField(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory",
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Inventory for {self.product.sku}"

    @property
    def available_quantity(self) -> int:
        return max(int(self.stock_quantity) - int(self.reserved_quantity), 0)

    @property
    def is_low_stock(self) -> bool:
        return 0 < self.available_quantity <= self.low_stock_threshold

    @property
    def is_out_of_stock(self) -> bool:
        return self.available_quantity <= 0

    @classmethod
    def ensure_for_product(cls, product: Product) -> "Inventory":
        inventory, _ = cls.objects.get_or_create(
            product=product,
            defaults={
                "stock_quantity": product.stock_quantity,
                "reserved_quantity": product.reserved_quantity,
            },
        )
        return inventory

    def sync_product_counts(self):
        Product.objects.filter(pk=self.product_id).update(
            stock_quantity=self.stock_quantity,
            reserved_quantity=self.reserved_quantity,
        )


class InventoryTransaction(models.Model):
    """Immutable record of every stock movement (audit trail)."""

    class Reason(models.TextChoices):
        SALE = "SALE", "Sale"
        SALE_CANCELLED = "SALE_CANCELLED", "Sale cancelled"
        PURCHASE = "PURCHASE", "Purchase"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        RETURN = "RETURN", "Return"
        RESERVATION = "RESERVATION", "Reservation"
        RELEASE = "RELEASE", "Release"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory_transactions",
    )
    quantity_change = models.IntegerField()
    reason = models.CharField(
        max_length=30,
        choices=Reason.choices,
        default=Reason.ADJUSTMENT,
    )
    reference = models.CharField(max_length=100, blank=True)
    admin_user = models.ForeignKey(
        AdminUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="inventory_adjustments",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.sku} {self.quantity_change:+d} ({self.reason})"