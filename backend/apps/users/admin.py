from django.contrib import admin

from .models import Address, AdminUser, DeviceToken, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "phone", "active", "created_at")
    list_filter = ("active", "created_at")
    search_fields = ("name", "email", "phone", "firebase_uid")
    readonly_fields = ("firebase_uid", "created_at", "updated_at")


@admin.register(AdminUser)
class AdminUserAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "role", "active", "last_login")
    list_filter = ("role", "active")
    search_fields = ("name", "email", "supabase_uid")
    readonly_fields = ("supabase_uid", "created_at", "updated_at")


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("full_name", "city", "state", "pincode", "is_default")
    list_filter = ("state",)
    search_fields = ("full_name", "phone", "pincode", "city", "state")
    raw_id_fields = ("customer",)


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ("customer", "platform", "active", "last_seen_at")
    list_filter = ("platform", "active")
    search_fields = ("token", "customer__email")
    readonly_fields = ("created_at", "last_seen_at")