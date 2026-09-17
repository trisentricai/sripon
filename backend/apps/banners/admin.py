from django.contrib import admin

from .models import Banner, BannerImage


class BannerImageInline(admin.TabularInline):
    model = BannerImage
    extra = 0


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "placement",
        "display_priority",
        "active",
        "start_date",
        "end_date",
    )
    list_filter = ("placement", "active")
    list_editable = ("active", "display_priority")
    search_fields = ("title", "subtitle")
    raw_id_fields = ("link_product", "link_category", "manager")
    inlines = (BannerImageInline,)