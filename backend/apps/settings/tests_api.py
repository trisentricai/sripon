from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.banners.models import Banner
from apps.categories.models import Category
from apps.orders.models import Order, OrderItem
from apps.products.models import Product
from apps.users.models import AdminUser

from .models import HomepageSection


def make_product(sku, slug, price=Decimal("10"), **extra):
    return Product.objects.create(
        sku=sku, name=slug.replace("-", " ").title(), slug=slug, price=price, **extra
    )


class PublicHomeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.p1 = make_product("H1", "alpha", Decimal("100"))
        self.p2 = make_product("H2", "beta", Decimal("200"), is_featured=True)
        self.cat = Category.objects.create(name="Sparks", slug="sparks")
        self.banner = Banner.objects.create(title="Home Hero", active=True)

        HomepageSection.objects.create(
            section_type=HomepageSection.SectionType.HERO,
            title="Hero",
            content_type=HomepageSection.ContentType.BANNER,
            linked_banner=self.banner,
            display_order=0,
            enabled=True,
        )
        HomepageSection.objects.create(
            section_type=HomepageSection.SectionType.BEST_SELLERS,
            title="Best Sellers",
            content_type=HomepageSection.ContentType.PRODUCTS,
            display_order=1,
            enabled=True,
        )
        HomepageSection.objects.create(
            section_type=HomepageSection.SectionType.CATEGORIES,
            title="Categories",
            content_type=HomepageSection.ContentType.CATEGORIES,
            display_order=2,
            enabled=True,
        )
        HomepageSection.objects.create(
            section_type=HomepageSection.SectionType.OFFERS,
            title="Disabled",
            content_type=HomepageSection.ContentType.PRODUCTS,
            display_order=3,
            enabled=False,
        )

    def test_home_returns_enabled_ordered_sections(self):
        response = self.client.get("/api/v1/home/")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(
            [item["section_type"] for item in data],
            ["HERO", "BEST_SELLERS", "CATEGORIES"],
        )

    def test_banner_payload(self):
        response = self.client.get("/api/v1/home/")
        hero = response.data["data"][0]
        self.assertEqual(hero["payload"]["title"], "Home Hero")
        self.assertEqual(hero["payload"]["cta"]["action"], "NONE")

    def test_best_sellers_falls_back_to_popularity(self):
        order = Order.objects.create(
            order_number="SP-20260917-000101",
            customer=_dummy_customer(),
            address_snapshot={},
            subtotal=Decimal("180"),
            total=Decimal("180"),
        )
        OrderItem.objects.create(
            order=order,
            product=self.p2,
            name=self.p2.name,
            sku=self.p2.sku,
            quantity=4,
            unit_price=Decimal("200"),
            final_price=Decimal("200"),
            line_total=Decimal("800"),
        )
        response = self.client.get("/api/v1/home/")
        payload = response.data["data"][1]["payload"]
        slugs = [item["slug"] for item in payload]
        self.assertEqual(slugs, ["beta", "alpha"])

    def test_categories_payload(self):
        response = self.client.get("/api/v1/home/")
        payload = response.data["data"][2]["payload"]
        self.assertEqual([item["slug"] for item in payload], ["sparks"])


def _dummy_customer():
    from apps.users.models import UserProfile

    return UserProfile.objects.create(firebase_uid="hm-1", name="Home", email="hm@sripon.in")


class AdminHomeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm2-1",
            email="content2@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.order_mgr = AdminUser.objects.create(
            supabase_uid="om3-1",
            email="orders3@sripon.test",
            role=AdminUser.Role.ORDER_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.content_mgr)
        self.url = "/api/v1/admin/home/"
        self.banner = Banner.objects.create(title="B", active=True)

    def test_create_and_patch(self):
        response = self.client.post(
            self.url,
            {
                "section_type": "HERO",
                "title": "Hero",
                "content_type": "BANNER",
                "linked_banner": self.banner.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, getattr(response, "data", None))
        section_id = response.data["data"]["id"]
        self.assertTrue(response.data["data"]["enabled"])

        response = self.client.patch(
            f"{self.url}{section_id}/", {"enabled": False, "display_order": 9}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        section = HomepageSection.objects.get(pk=section_id)
        self.assertFalse(section.enabled)
        self.assertEqual(section.display_order, 9)

    def test_banner_content_requires_banner(self):
        response = self.client.post(
            self.url,
            {"section_type": "HERO", "content_type": "BANNER"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_reorder(self):
        a = HomepageSection.objects.create(section_type="OFFERS", title="A")
        b = HomepageSection.objects.create(section_type="FEATURED", title="B")
        response = self.client.post(
            f"{self.url}reorder/", {"ids": [b.id, a.id]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        b.refresh_from_db()
        a.refresh_from_db()
        self.assertEqual(b.display_order, 0)
        self.assertEqual(a.display_order, 1)

    def test_delete(self):
        section = HomepageSection.objects.create(section_type="OFFERS", title="X")
        response = self.client.delete(f"{self.url}{section.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(HomepageSection.objects.filter(pk=section.pk).exists())

    def test_permissions(self):
        self.client.force_authenticate(user=self.order_mgr)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        anonymous = APIClient()
        self.assertEqual(anonymous.get(self.url).status_code, 401)