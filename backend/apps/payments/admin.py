from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "payment_id",
        "order",
        "provider",
        "amount",
        "currency",
        "status",
        "provider_ref",
        "completed_at",
    )
    list_filter = ("provider", "status", "created_at")
    search_fields = ("order__order_number", "provider_ref")
    readonly_fields = ("payment_id", "created_at", "updated_at", "webhook_payload")