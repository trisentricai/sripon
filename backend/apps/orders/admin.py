from django.contrib import admin

from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "name",
        "sku",
        "unit_price",
        "discount",
        "tax_percent",
        "quantity",
        "final_price",
        "line_total",
    )
    can_delete = False
    raw_id_fields = ("product",)


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ("from_status", "to_status", "note", "actor_type", "actor")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "customer",
        "total",
        "payment_status",
        "order_status",
        "placed_at",
    )
    list_filter = ("order_status", "payment_status", "placed_at")
    search_fields = ("order_number", "customer__name", "customer__email")
    readonly_fields = (
        "order_number",
        "customer",
        "address_snapshot",
        "subtotal",
        "discount",
        "tax",
        "delivery_fee",
        "coupon_code",
        "total",
        "placed_at",
        "created_at",
        "updated_at",
    )
    inlines = (OrderItemInline, OrderStatusHistoryInline)