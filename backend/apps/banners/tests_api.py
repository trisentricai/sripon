from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.categories.models import Category
from apps.products.models import Product
from apps.users.models import AdminUser

from .models import Banner, BannerImage


class BannerPublicApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        self.banner = Banner.objects.create(
            title="Diwali Sale",
            subtitle="Festive offers",
            placement=Banner.Placement.HOME_HERO,
            cta_text="Shop now",
            cta_action=Banner.CtaAction.URL,
            custom_url="https://sripon.in/diwali",
            display_priority=1,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=7),
            active=True,
        )
        Banner.objects.create(
            title="Hidden", placement=Banner.Placement.HOME_HERO, active=False
        )
        Banner.objects.create(
            title="Scheduled later",
            placement=Banner.Placement.HOME_HERO,
            start_date=now + timedelta(days=1),
            active=True,
        )
        Banner.objects.create(
            title="Scheduled bottom",
            placement=Banner.Placement.HOME_BOTTOM,
            active=True,
        )
        BannerImage.objects.create(
            banner=self.banner,
            variant=BannerImage.Variant.DESKTOP,
            public_id="b/DESKTOP",
            secure_url="https://res.cloudinary.com/x/banners/desktop.jpg",
            alt_text="Diwali desktop",
        )
        BannerImage.objects.create(
            banner=self.banner,
            variant=BannerImage.Variant.MOBILE,
            public_id="b/MOBILE",
            secure_url="https://res.cloudinary.com/x/banners/mobile.jpg",
        )
        self.other = Product.objects.create(
            sku="BN-1", name="Banner Product", slug="banner-product", price=Decimal("10")
        )

    def test_list_returns_only_live_banners(self):
        response = self.client.get("/api/v1/banners/")
        self.assertEqual(response.status_code, 200)
        titles = {item["title"] for item in response.data["data"]}
        self.assertEqual(titles, {"Diwali Sale", "Scheduled bottom"})

    def test_filter_by_placement(self):
        response = self.client.get("/api/v1/banners/?placement=HOME_BOTTOM")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["title"], "Scheduled bottom")

    def test_rejects_unknown_placement(self):
        response = self.client.get("/api/v1/banners/?placement=NOPE")
        self.assertEqual(response.status_code, 400)

    def test_detail_returns_cta_and_images(self):
        response = self.client.get(f"/api/v1/banners/{self.banner.id}/")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(data["cta"]["action"], "URL")
        self.assertEqual(data["cta"]["url"], "https://sripon.in/diwali")
        self.assertEqual(set(data["images"]), {"DESKTOP", "MOBILE"})
        self.assertEqual(
            data["images"]["DESKTOP"]["url"],
            "https://res.cloudinary.com/x/banners/desktop.jpg",
        )

    def test_detail_hides_inactive(self):
        inactive = Banner.objects.get(title="Hidden")
        response = self.client.get(f"/api/v1/banners/{inactive.id}/")
        self.assertEqual(response.status_code, 404)

    def test_detail_hides_scheduled(self):
        scheduled = Banner.objects.get(title="Scheduled later")
        response = self.client.get(f"/api/v1/banners/{scheduled.id}/")
        self.assertEqual(response.status_code, 404)

    def test_detail_missing(self):
        response = self.client.get("/api/v1/banners/99999/")
        self.assertEqual(response.status_code, 404)

    def test_cta_resolution_variants(self):
        product_banner = Banner.objects.create(
            title="Product CTA",
            cta_action=Banner.CtaAction.PRODUCT,
            link_product=self.other,
            active=True,
        )
        category = Category.objects.create(name="Rockets", slug="rockets")
        category_banner = Banner.objects.create(
            title="Category CTA",
            cta_action=Banner.CtaAction.CATEGORY,
            link_category=category,
            active=True,
        )
        response = self.client.get(f"/api/v1/banners/{product_banner.id}/")
        cta = response.data["data"]["cta"]
        self.assertEqual(cta["product_id"], self.other.id)
        self.assertEqual(cta["product_slug"], "banner-product")
        response = self.client.get(f"/api/v1/banners/{category_banner.id}/")
        cta = response.data["data"]["cta"]
        self.assertEqual(cta["category_id"], category.id)
        self.assertEqual(cta["category_slug"], "rockets")


class BannerAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm-1",
            email="content@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.order_mgr = AdminUser.objects.create(
            supabase_uid="om2-1",
            email="orders2@sripon.test",
            role=AdminUser.Role.ORDER_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.content_mgr)
        self.admin_url = "/api/v1/admin/banners/"
        self.now = timezone.now()

    def create_banner(self, **extra):
        payload = {"title": "Cinco", "placement": Banner.Placement.HOME_HERO}
        payload.update(extra)
        response = self.client.post(self.admin_url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data["data"]

    def test_create_banner(self):
        data = self.create_banner(
            subtitle="Cinco de Mayo",
            cta_text="Shop",
            cta_action=Banner.CtaAction.URL,
            custom_url="https://sripon.in/cinco",
        )
        banner = Banner.objects.get(pk=data["id"])
        self.assertEqual(banner.manager, self.content_mgr)
        self.assertEqual(banner.placement, Banner.Placement.HOME_HERO)
        self.assertTrue(banner.active)

    def test_url_cta_requires_url(self):
        response = self.client.post(
            self.admin_url,
            {"title": "Bad", "cta_action": Banner.CtaAction.URL},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_product_cta_requires_product(self):
        response = self.client.post(
            self.admin_url,
            {"title": "Bad", "cta_action": Banner.CtaAction.PRODUCT},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_toggle_active(self):
        data = self.create_banner()
        response = self.client.patch(
            f"{self.admin_url}{data['id']}/", {"active": False}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        Banner.objects.get(pk=data["id"]).active is False

    def test_patch_bad_date_range(self):
        data = self.create_banner(start_date="2026-09-20T00:00:00Z")
        response = self.client.patch(
            f"{self.admin_url}{data['id']}/",
            {"end_date": "2026-09-10T00:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_list_filters(self):
        self.create_banner(title="Alpha")
        self.create_banner(title="Beta", placement=Banner.Placement.HOME_BOTTOM)
        response = self.client.get(self.admin_url, {"placement": "HOME_BOTTOM"})
        titles = {item["title"] for item in response.data["data"]}
        self.assertEqual(titles, {"Beta"})
        response = self.client.get(self.admin_url, {"search": "Bet"})
        self.assertEqual(len(response.data["data"]), 1)
        response = self.client.get(self.admin_url, {"active": "true"})
        self.assertEqual(len(response.data["data"]), 2)

    @patch("apps.banners.services.storage.upload_image")
    @patch("apps.banners.services.storage.delete_image")
    def test_upload_and_replace_variant(self, delete_image, upload_image):
        upload_image.return_value = {
            "public_id": "b/cinco-desktop",
            "secure_url": "https://res.cloudinary.com/x/cinco-desktop.jpg",
            "width": 1920,
            "height": 800,
        }
        data = self.create_banner()
        upload = {"variant": "DESKTOP", "alt_text": "Cinco wide"}
        import io

        file = io.BytesIO(b"imaginary")
        file.name = "cinco.jpg"
        response = self.client.post(
            f"{self.admin_url}{data['id']}/images/",
            {"variant": "DESKTOP", "alt_text": "Cinco wide", "file": file},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["data"]["width"], 1920)
        self.assertEqual(response.data["data"]["variant"], "DESKTOP")
        image = BannerImage.objects.get(banner_id=data["id"], variant="DESKTOP")
        self.assertEqual(image.public_id, "b/cinco-desktop")
        self.assertEqual(image.alt_text, "Cinco wide")
        delete_image.assert_not_called()

        # Replacing the variant removes the previous asset.
        upload_image.return_value = {
            "public_id": "b/cinco-desktop-v2",
            "secure_url": "https://res.cloudinary.com/x/cinco-v2.jpg",
        }
        response = self.client.post(
            f"{self.admin_url}{data['id']}/images/",
            {"variant": "DESKTOP", "file": file},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        delete_image.assert_called_once_with("b/cinco-desktop")
        self.assertEqual(
            BannerImage.objects.filter(banner_id=data["id"]).count(), 1
        )

    @patch("apps.banners.services.storage.delete_image")
    def test_delete_variant_image(self, delete_image):
        banner = Banner.objects.create(title="V", active=True)
        BannerImage.objects.create(
            banner=banner, variant="MOBILE", public_id="b/m",
            secure_url="https://res.cloudinary.com/x/m.jpg",
        )
        response = self.client.delete(f"{self.admin_url}{banner.id}/images/MOBILE/")
        self.assertEqual(response.status_code, 200)
        delete_image.assert_called_once_with("b/m")
        self.assertFalse(BannerImage.objects.filter(banner=banner).exists())

    @patch("apps.banners.services.storage.delete_image")
    def test_delete_banner_destroys_assets(self, delete_image):
        banner = Banner.objects.create(title="Doomed")
        BannerImage.objects.create(
            banner=banner, variant="DESKTOP", public_id="b/d",
            secure_url="https://res.cloudinary.com/x/d.jpg",
        )
        BannerImage.objects.create(
            banner=banner, variant="MOBILE", public_id="b/m2",
            secure_url="https://res.cloudinary.com/x/m2.jpg",
        )
        response = self.client.delete(f"{self.admin_url}{banner.id}/")
        self.assertEqual(response.status_code, 200)
        delete_image.assert_any_call("b/d")
        delete_image.assert_any_call("b/m2")
        self.assertFalse(Banner.objects.filter(pk=banner.pk).exists())

    def test_duplicate_banner(self):
        banner = Banner.objects.create(title="OG", active=True)
        BannerImage.objects.create(
            banner=banner, variant="DESKTOP", public_id="b/og",
            secure_url="https://res.cloudinary.com/x/og.jpg",
        )
        response = self.client.post(f"{self.admin_url}{banner.id}/duplicate/")
        self.assertEqual(response.status_code, 201)
        clone = Banner.objects.get(title="OG (copy)")
        self.assertFalse(clone.active)
        self.assertEqual(clone.images.count(), 1)
        self.assertEqual(clone.images.get().public_id, "b/og")
        self.assertEqual(clone.manager, self.content_mgr)

    def test_permissions_denied_for_order_manager(self):
        self.client.force_authenticate(user=self.order_mgr)
        response = self.client.get(self.admin_url)
        self.assertEqual(response.status_code, 403)

    def test_anonymous_denied(self):
        anonymous = APIClient()
        self.assertEqual(anonymous.get(self.admin_url).status_code, 401)
        self.assertEqual(anonymous.get("/api/v1/banners/").status_code, 200)