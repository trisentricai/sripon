from django.contrib import admin

from .models import Cart, CartItem, Wishlist, WishlistItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    raw_id_fields = ("product",)


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("customer", "created_at", "updated_at")
    raw_id_fields = ("customer",)
    inlines = (CartItemInline,)


class WishlistItemInline(admin.TabularInline):
    model = WishlistItem
    extra = 0
    raw_id_fields = ("product",)


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ("customer", "created_at", "updated_at")
    raw_id_fields = ("customer",)
    inlines = (WishlistItemInline,)