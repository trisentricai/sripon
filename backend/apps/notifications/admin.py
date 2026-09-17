from django.contrib import admin

from .models import Notification, NotificationEventLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "customer", "read_at", "created_at")
    list_filter = ("type", "created_at")
    search_fields = ("title", "body")
    raw_id_fields = ("customer",)


@admin.register(NotificationEventLog)
class NotificationEventLogAdmin(admin.ModelAdmin):
    list_display = ("event", "recipient_type", "channel", "status", "created_at")
    list_filter = ("recipient_type", "channel", "status", "created_at")