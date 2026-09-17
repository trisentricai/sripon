from django.contrib import admin

from .models import Coupon, CouponUsage


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "discount_value",
        "minimum_order_value",
        "maximum_discount",
        "start_date",
        "expiry_date",
        "usage_limit",
        "active",
    )
    list_filter = ("discount_type", "active", "start_date", "expiry_date")
    search_fields = ("code",)


@admin.register(CouponUsage)
class CouponUsageAdmin(admin.ModelAdmin):
    list_display = ("coupon", "customer", "order", "applied_discount", "created_at")
    search_fields = ("coupon__code", "customer__email", "order__order_number")
    readonly_fields = ("created_at",)