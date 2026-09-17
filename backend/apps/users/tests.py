from datetime import timedelta
from unittest.mock import patch

import jwt as pyjwt
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APIRequestFactory

from apps.users.authentication import (
    BearerTokenAuthentication,
    SriPonApiAuthentication,
    sync_user_from_firebase_claims,
)
from apps.users.models import Address, AdminUser, DeviceToken, UserProfile
from rest_framework.exceptions import AuthenticationFailed

SUPABASE_SETTINGS = {
    "URL": "https://test.supabase.co",
    "ANON_KEY": "anon-key",
    "SERVICE_ROLE_KEY": "service-role-key",
    "JWT_SECRET": "test-jwt-secret-for-sripon-tests-0123456789",
    "JWT_AUDIENCE": "authenticated",
}

FIREBASE_AUDIENCE = (
    "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit."
    "v1.IdentityToolkit"
)


def firebase_claims(uid="cust-1", name="Aarav", email="aarav@sripon.in", verified=True):
    return {
        "uid": uid,
        "name": name,
        "email": email,
        "email_verified": verified,
    }


def supabase_jwt(
    sub="admin-1",
    email="admin@sripon.in",
    role=None,
    name="Test Admin",
    secret=SUPABASE_SETTINGS["JWT_SECRET"],
    iss="https://test.supabase.co/auth/v1",
    expires_in=timedelta(hours=1),
):
    now = timezone.now()
    payload = {
        "sub": sub,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "iss": iss,
        "iat": now,
        "exp": now + expires_in,
        "user_metadata": {"name": name},
    }
    if role:
        payload["app_metadata"] = {"sripon_role": role}
    return pyjwt.encode(payload, secret, algorithm="HS256")


class FirebaseVerifyEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/v1/auth/firebase/verify/"

    @patch("apps.users.api._verify_firebase_token")
    def test_first_verify_creates_profile(self, verify):
        verify.return_value = firebase_claims()
        response = self.client.post(self.url, {"token": "id-token"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertTrue(response.data["data"]["auth"]["is_new"])
        self.assertEqual(response.data["data"]["email"], "aarav@sripon.in")
        self.assertTrue(UserProfile.objects.filter(firebase_uid="cust-1").exists())

    @patch("apps.users.api._verify_firebase_token")
    def test_repeat_verify_syncs_existing_profile(self, verify):
        verify.return_value = firebase_claims()
        self.client.post(self.url, {"token": "id-token"}, format="json")
        verify.return_value = firebase_claims(name="Aarav Sharma")
        response = self.client.post(self.url, {"token": "id-token"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["data"]["auth"]["is_new"])
        self.assertEqual(UserProfile.objects.count(), 1)
        self.assertEqual(UserProfile.objects.get().name, "Aarav Sharma")

    def test_missing_token_is_rejected(self):
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    @patch("apps.users.api._verify_firebase_token")
    def test_invalid_token_is_unauthorized(self, verify):
        verify.side_effect = AuthenticationFailed("Invalid or expired Firebase token.")
        response = self.client.post(self.url, {"token": "bad"}, format="json")
        self.assertEqual(response.status_code, 401)

    @patch("apps.users.api._verify_firebase_token")
    def test_google_alias_works(self, verify):
        verify.return_value = firebase_claims(uid="g-1", email="g@sripon.in")
        response = self.client.post("/api/v1/auth/google/", {"token": "g"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(UserProfile.objects.filter(firebase_uid="g-1").exists())


class MeEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.profile = UserProfile.objects.create(
            firebase_uid="cust-me", name="Me", email="me@sripon.in"
        )

    def test_anonymous_is_forbidden(self):
        self.assertIn(
            self.client.get("/api/v1/auth/me/").status_code, (401, 403)
        )

    def test_get_profile_with_firebase_token(self):
        with patch(
            "apps.users.authentication._verify_firebase_token",
            return_value=firebase_claims(uid="cust-me", name="Me", email="me@sripon.in"),
        ):
            response = self.client.get(
                "/api/v1/auth/me/", HTTP_AUTHORIZATION="Bearer fake-id-token"
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["firebase_uid"], "cust-me")

    def test_patch_profile(self):
        self.client.force_authenticate(user=self.profile)
        response = self.client.patch(
            "/api/v1/auth/me/", {"name": "New Name", "phone": "9999999999"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.name, "New Name")
        self.assertEqual(self.profile.phone, "9999999999")

    def test_supabase_token_rejected_on_customer_endpoint(self):
        with patch(
            "apps.users.authentication._verify_firebase_token",
            side_effect=AuthenticationFailed("Invalid or expired Firebase token."),
        ):
            response = self.client.get(
                "/api/v1/auth/me/",
                HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(role='ADMIN')}",
            )
        self.assertEqual(response.status_code, 401)


class DeviceTokenEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.profile = UserProfile.objects.create(
            firebase_uid="cust-dev", name="Dev", email="dev@sripon.in"
        )
        self.client.force_authenticate(user=self.profile)

    def test_register_device_token(self):
        response = self.client.post(
            "/api/v1/auth/me/device-token/",
            {"token": "fcm-1", "platform": "ANDROID", "app_version": "1.0.0"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(DeviceToken.objects.filter(token="fcm-1").exists())

    def test_reregistering_token_is_idempotent(self):
        payload = {"token": "fcm-2", "platform": "IOS"}
        first = self.client.post(
            "/api/v1/auth/me/device-token/", payload, format="json"
        )
        second = self.client.post(
            "/api/v1/auth/me/device-token/", payload, format="json"
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(DeviceToken.objects.filter(token="fcm-2").count(), 1)


class AddressEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.profile = UserProfile.objects.create(
            firebase_uid="cust-addr", name="Addr", email="addr@sripon.in"
        )
        self.client.force_authenticate(user=self.profile)
        self.payload = {
            "full_name": "Addr User",
            "phone": "9876543210",
            "address_line_1": "1 Firecracker Street",
            "city": "Sivakasi",
            "state": "Tamil Nadu",
            "pincode": "626123",
            "is_default": True,
        }

    def test_create_and_list_addresses(self):
        create = self.client.post(
            "/api/v1/auth/addresses/", self.payload, format="json"
        )
        self.assertEqual(create.status_code, 201)
        listed = self.client.get("/api/v1/auth/addresses/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data["data"]), 1)

    def test_set_default_clears_previous_default(self):
        first = Address.objects.create(customer=self.profile, is_default=True, **{
            "full_name": "A", "phone": "1", "address_line_1": "1", "city": "C",
            "state": "S", "pincode": "1",
        })
        second = Address.objects.create(customer=self.profile, is_default=False, **{
            "full_name": "B", "phone": "2", "address_line_1": "2", "city": "C",
            "state": "S", "pincode": "2",
        })
        response = self.client.post(f"/api/v1/auth/addresses/{second.pk}/default/")
        self.assertEqual(response.status_code, 200)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertFalse(first.is_default)
        self.assertTrue(second.is_default)

    def test_addresses_are_scoped_to_customer(self):
        other = UserProfile.objects.create(
            firebase_uid="cust-other", name="Other", email="other@sripon.in"
        )
        foreign = Address.objects.create(customer=other, **{
            "full_name": "X", "phone": "3", "address_line_1": "3", "city": "C",
            "state": "S", "pincode": "3",
        })
        response = self.client.get(f"/api/v1/auth/addresses/{foreign.pk}/")
        self.assertEqual(response.status_code, 404)


@override_settings(SUPABASE=SUPABASE_SETTINGS)
class AdminAuthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/v1/auth/admin/verify/"

    def test_valid_token_provisions_admin(self):
        response = self.client.get(
            self.url, HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(role='ORDER_MANAGER')}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["role"], "ORDER_MANAGER")
        self.assertTrue(AdminUser.objects.filter(supabase_uid="admin-1").exists())

    def test_existing_admin_role_is_preserved_without_claim(self):
        AdminUser.objects.create(
            supabase_uid="admin-2",
            email="admin2@sripon.in",
            name="Admin Two",
            role=AdminUser.Role.ANALYST,
        )
        response = self.client.get(
            self.url, HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(sub='admin-2', email='admin2@sripon.in', name='Admin Two')}"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["role"], "ANALYST")

    def test_unknown_user_without_role_is_rejected(self):
        response = self.client.get(
            self.url, HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(sub='stranger')}"
        )
        self.assertEqual(response.status_code, 401)

    def test_inactive_admin_is_rejected(self):
        AdminUser.objects.create(
            supabase_uid="admin-3",
            email="admin3@sripon.in",
            name="Admin Three",
            role=AdminUser.Role.ADMIN,
            active=False,
        )
        response = self.client.get(
            self.url, HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(sub='admin-3', email='admin3@sripon.in')}"
        )
        self.assertEqual(response.status_code, 401)

    def test_bad_signature_is_rejected(self):
        token = supabase_jwt(role="ADMIN", secret="wrong-secret-that-is-long-enough-0000")
        response = self.client.get(self.url, HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(response.status_code, 401)

    def test_missing_token_is_rejected(self):
        self.assertIn(self.client.get(self.url).status_code, (401, 403))


class AuthenticationDispatcherTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = SriPonApiAuthentication()

    def test_no_header_returns_none(self):
        request = self.factory.get("/api/v1/auth/me/")
        self.assertIsNone(self.auth.authenticate(request))

    def test_malformed_token_is_rejected(self):
        request = self.factory.get("/api/v1/auth/me/", HTTP_AUTHORIZATION="Bearer not-a-jwt")
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(request)

    @patch("apps.users.authentication._verify_firebase_token")
    def test_routes_firebase_token(self, verify):
        verify.return_value = firebase_claims(uid="disp-1", email="disp@sripon.in")
        token = pyjwt.encode(
            {"aud": FIREBASE_AUDIENCE, "sub": "disp-1"},
            "unused",
            algorithm="HS256",
        )
        request = self.factory.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
        user, _ = self.auth.authenticate(request)
        self.assertIsInstance(user, UserProfile)
        self.assertEqual(user.firebase_uid, "disp-1")

    @override_settings(SUPABASE=SUPABASE_SETTINGS)
    def test_routes_supabase_token(self):
        request = self.factory.get(
            "/api/v1/auth/admin/verify/",
            HTTP_AUTHORIZATION=f"Bearer {supabase_jwt(sub='disp-admin', role='ADMIN')}",
        )
        user, _ = self.auth.authenticate(request)
        self.assertIsInstance(user, AdminUser)
        self.assertEqual(user.role, AdminUser.Role.ADMIN)

    def test_inactive_customer_is_rejected(self):
        UserProfile.objects.create(
            firebase_uid="inactive-1",
            name="Inactive",
            email="inactive@sripon.in",
            active=False,
        )
        with patch(
            "apps.users.authentication._verify_firebase_token",
            return_value=firebase_claims(uid="inactive-1"),
        ):
            request = self.factory.get(
                "/api/v1/auth/me/", HTTP_AUTHORIZATION="Bearer x"
            )
            with self.assertRaises(AuthenticationFailed):
                self.auth.authenticate(request)

    def test_bearer_helper_parses_scheme(self):
        helper = BearerTokenAuthentication()
        request = self.factory.get("/", HTTP_AUTHORIZATION="Bearer abc.def.ghi")
        self.assertEqual(helper.get_bearer_token(request), "abc.def.ghi")
        other = self.factory.get("/", HTTP_AUTHORIZATION="Basic abc")
        self.assertIsNone(helper.get_bearer_token(other))


class SyncHelperTests(TestCase):
    def test_sync_creates_then_updates(self):
        profile, created = sync_user_from_firebase_claims(
            {"uid": "sync-1", "name": "One", "email": "one@sripon.in"}
        )
        self.assertTrue(created)
        self.assertEqual(profile.name, "One")

        profile, created = sync_user_from_firebase_claims(
            {"uid": "sync-1", "name": "Two", "email": "one@sripon.in"}
        )
        self.assertFalse(created)
        self.assertEqual(profile.name, "Two")