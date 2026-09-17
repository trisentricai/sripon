from django.contrib import admin

from .models import SiteSetting, HomepageSection


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "group", "updated_at")
    list_filter = ("group",)
    search_fields = ("key",)


@admin.register(HomepageSection)
class HomepageSectionAdmin(admin.ModelAdmin):
    list_display = (
        "section_type",
        "title",
        "content_type",
        "enabled",
        "display_order",
    )
    list_editable = ("enabled", "display_order")
    list_filter = ("section_type", "content_type", "enabled")
    raw_id_fields = ("linked_banner",)
    filter_horizontal = ("linked_categories", "linked_products")