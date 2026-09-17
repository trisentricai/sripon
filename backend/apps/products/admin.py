from django.contrib import admin

from .models import Product, ProductImage, Inventory, InventoryTransaction


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "category",
        "price",
        "discount_price",
        "stock_quantity",
        "is_active",
        "is_featured",
        "is_best_seller",
    )
    list_editable = ("is_active", "is_featured", "is_best_seller")
    list_filter = ("is_active", "is_featured", "is_best_seller", "is_new", "category")
    search_fields = ("name", "sku", "product_code", "brand")
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("category",)
    readonly_fields = ("created_at", "updated_at")
    inlines = (ProductImageInline,)


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "stock_quantity",
        "reserved_quantity",
        "available_quantity",
        "low_stock_threshold",
        "is_low_stock",
        "updated_at",
    )
    search_fields = ("product__sku", "product__name")


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity_change", "reason", "reference", "created_at")
    list_filter = ("reason", "created_at")
    search_fields = ("product__sku", "product__name", "reference")
    readonly_fields = ("created_at",)