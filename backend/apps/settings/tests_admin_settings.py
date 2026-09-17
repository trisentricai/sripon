"""Phase 12 admin site-settings endpoint tests."""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import AdminUser

from .models import SiteSetting


class SiteSettingAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.settings_mgr = AdminUser.objects.create(
            supabase_uid="sm-settings",
            email="settings@sripon.test",
            role=AdminUser.Role.ADMIN,
            active=True,
        )
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm-settings",
            email="cm-settings@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.client.force_authenticate(user=self.settings_mgr)
        self.url = "/api/v1/admin/settings/"

    def test_requires_permission(self):
        self.client.force_authenticate(user=self.content_mgr)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_create_setting(self):
        response = self.client.post(
            self.url,
            {"key": "hero_title", "value": "Welcome", "group": SiteSetting.Group.GENERAL},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            SiteSetting.objects.filter(key="hero_title").exists()
        )

    def test_duplicate_key_rejected(self):
        self.client.post(
            self.url,
            {"key": "dupe", "value": "A", "group": "g"},
            format="json",
        )
        response = self.client.post(
            self.url,
            {"key": "dupe", "value": "B", "group": "g"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_empty_key_rejected(self):
        response = self.client.post(
            self.url,
            {"key": "", "value": "A", "group": "g"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_list_filter_by_group(self):
        SiteSetting.objects.create(key="a", value="1", group=SiteSetting.Group.GENERAL)
        SiteSetting.objects.create(key="b", value="2", group=SiteSetting.Group.SHOPPING)
        response = self.client.get(self.url, {"group": SiteSetting.Group.GENERAL})
        self.assertEqual(len(response.data["data"]), 1)
        self.assertEqual(response.data["data"][0]["key"], "a")

    def test_get_by_key(self):
        SiteSetting.objects.create(key="mykey", value="val", group="g")
        response = self.client.get(f"{self.url}mykey/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["value"], "val")

    def test_patch_by_key(self):
        setting = SiteSetting.objects.create(
            key="patchkey", value="old", group="g"
        )
        response = self.client.patch(
            f"{self.url}patchkey/", {"value": "new"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        setting.refresh_from_db()
        self.assertEqual(setting.value, "new")

    def test_delete_by_key(self):
        setting = SiteSetting.objects.create(
            key="delkey", value="v", group="g"
        )
        response = self.client.delete(f"{self.url}delkey/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(SiteSetting.objects.filter(key="delkey").exists())