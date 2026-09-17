"""DRF authentication and permissions for the customer and admin planes.

Customer tokens are Firebase ID tokens (verified with the Firebase Admin SDK);
admin tokens are Supabase JWTs (verified with PyJWT using the Supabase JWT
secret). The two planes never share a token type.
"""
import logging

import jwt as pyjwt
from django.conf import settings
from django.utils import timezone
from firebase_admin import _apps
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, initialize_app
from rest_framework import authentication, exceptions, permissions

from .models import AdminUser, UserProfile
from .permissions import role_has_permission

logger = logging.getLogger("apps.users")

FIREBASE_AUDIENCE = (
    "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit."
    "v1.IdentityToolkit"
)


class AuthenticationConfigurationError(Exception):
    """Raised when required identity-provider credentials are missing."""


def _firebase_app():
    """Return the cached Firebase Admin app built from settings.FIREBASE."""
    name = "sripon-firebase"
    existing = _apps.get(name)
    if existing is not None:
        return existing

    cfg = settings.FIREBASE
    service_account_path = cfg.get("SERVICE_ACCOUNT_PATH", "")
    cred = None

    if service_account_path:
        import os

        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
    if cred is None and cfg.get("PROJECT_ID") and cfg.get("CLIENT_EMAIL") and cfg.get("PRIVATE_KEY"):
        cred = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": cfg["PROJECT_ID"],
                "private_key_id": "",
                "private_key": cfg["PRIVATE_KEY"],
                "client_email": cfg["CLIENT_EMAIL"],
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )

    if cred is None:
        raise AuthenticationConfigurationError(
            "Firebase credentials are not configured."
        )

    return initialize_app(cred, options={"project_id": cfg.get("PROJECT_ID", "")}, name=name)


def _verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and return its decoded claims."""
    try:
        app = _firebase_app()
    except AuthenticationConfigurationError as exc:
        raise exceptions.AuthenticationFailed(str(exc)) from exc
    try:
        return firebase_auth.verify_id_token(token, app=app)
    except Exception:
        logger.info("Firebase token verification failed")
        raise exceptions.AuthenticationFailed(
            "Invalid or expired Firebase token."
        ) from None


def sync_user_from_firebase_claims(claims: dict):
    """Create or refresh the UserProfile for verified Firebase claims."""
    firebase_uid = claims["uid"]
    defaults = {
        "name": claims.get("name") or "",
        "email": claims.get("email") or "",
        "phone": claims.get("phone_number") or "",
    }
    profile, created = UserProfile.objects.get_or_create(
        firebase_uid=firebase_uid,
        defaults=defaults,
    )

    if not created:
        changed = {
            field: value
            for field, value in defaults.items()
            if value and getattr(profile, field) != value
        }
        if changed:
            UserProfile.objects.filter(pk=profile.pk).update(**changed)
            profile.refresh_from_db()

    return profile, created


def _decode_supabase_token(token: str) -> dict:
    """Decode and verify a Supabase JWT (HS256) with the configured secret."""
    cfg = settings.SUPABASE
    secret = cfg.get("JWT_SECRET", "")
    if not secret:
        raise AuthenticationConfigurationError(
            "Supabase JWT secret is not configured."
        )

    audience = cfg.get("JWT_AUDIENCE") or None
    try:
        claims = pyjwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience=audience,
            options={"verify_aud": audience is not None},
        )
    except pyjwt.InvalidTokenError as exc:
        logger.info("Supabase token verification failed")
        raise exceptions.AuthenticationFailed(
            "Invalid or expired admin token."
        ) from exc

    expected_issuer = (cfg.get("URL") or "").rstrip("/")
    if expected_issuer:
        issuer = (claims.get("iss") or "").rstrip("/")
        if issuer != f"{expected_issuer}/auth/v1":
            logger.info("Supabase token issuer mismatch")
            raise exceptions.AuthenticationFailed(
                "Invalid or expired admin token."
            )
    return claims


def sync_admin_from_jwt(claims: dict) -> AdminUser:
    """Upsert an AdminUser from verified Supabase claims.

    A new admin account is provisioned only when the JWT explicitly carries a
    SriPon role in ``app_metadata.sripon_role`` or ``role``, otherwise unknown
    Supabase users are rejected.
    """
    uid = claims.get("sub") or claims.get("user_id")
    if not uid:
        raise exceptions.AuthenticationFailed("Admin token is missing the user id.")

    app_metadata = claims.get("app_metadata") or {}
    user_metadata = claims.get("user_metadata") or {}
    role_claim = app_metadata.get("sripon_role") or claims.get("role")
    if role_claim not in AdminUser.Role.values:
        role_claim = None

    email = claims.get("email") or ""
    name = (
        claims.get("name")
        or app_metadata.get("name")
        or user_metadata.get("name")
        or ""
    )

    try:
        admin = AdminUser.objects.get(supabase_uid=uid)
        changed = {}
        if email and admin.email != email:
            changed["email"] = email
        if name and admin.name != name:
            changed["name"] = name
        if role_claim and admin.role != role_claim:
            changed["role"] = role_claim
        if changed:
            AdminUser.objects.filter(pk=admin.pk).update(**changed)
            admin.refresh_from_db()
    except AdminUser.DoesNotExist:
        if role_claim is None:
            raise exceptions.AuthenticationFailed(
                "No admin account is linked to this user."
            ) from None
        try:
            admin = AdminUser.objects.create(
                supabase_uid=uid,
                email=email or f"{uid}@supabase.local",
                name=name or email.split("@")[0] or "Admin",
                role=role_claim,
            )
        except Exception:
            admin = AdminUser.objects.get(supabase_uid=uid)

    if not admin.active:
        raise exceptions.AuthenticationFailed(
            "This admin account is disabled."
        )

    AdminUser.objects.filter(pk=admin.pk).update(last_login=timezone.now())
    return admin


class BearerTokenAuthentication(authentication.BaseAuthentication):
    """Reads an ``Authorization: Bearer <token>`` credential."""

    keyword = "Bearer"

    def authenticate_header(self, request):
        """Advertise the Bearer scheme so failures stay 401, not 403."""
        return self.keyword

    def get_bearer_token(self, request):
        header = request.headers.get("Authorization", "")
        if not header:
            return None
        try:
            scheme, token = header.split(" ", 1)
        except ValueError:
            raise exceptions.AuthenticationFailed(
                "Invalid Authorization header."
            ) from None
        if scheme.strip().lower() != self.keyword.lower():
            return None
        return token.strip()


class FirebaseAuthentication(BearerTokenAuthentication):
    """Authenticates a customer with a Firebase ID token."""

    def authenticate(self, request):
        token = self.get_bearer_token(request)
        if token is None:
            return None
        claims = _verify_firebase_token(token)
        profile, _ = sync_user_from_firebase_claims(claims)
        if not profile.active:
            raise exceptions.AuthenticationFailed(
                "This account is disabled."
            )
        return profile, claims


class SupabaseAuthentication(BearerTokenAuthentication):
    """Authenticates an admin with a Supabase JWT."""

    def authenticate(self, request):
        token = self.get_bearer_token(request)
        if token is None:
            return None
        claims = _decode_supabase_token(token)
        admin = sync_admin_from_jwt(claims)
        return admin, claims


class SriPonApiAuthentication(BearerTokenAuthentication):
    """Global dispatcher that routes a bearer token to the right provider.

    Used as the default DRF authentication so the customer and admin planes
    share a single Authorization header convention.
    """

    def authenticate(self, request):
        token = self.get_bearer_token(request)
        if token is None:
            return None

        try:
            header = pyjwt.get_unverified_header(token)
            payload = pyjwt.decode(token, options={"verify_signature": False})
        except pyjwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed(
                "Malformed authentication token."
            ) from None

        alg = header.get("alg", "")
        issuer = (payload.get("iss") or "").lower()
        is_firebase = (
            payload.get("aud") == FIREBASE_AUDIENCE
            or payload.get("user_id") is not None
            or (alg == "RS256" and "kid" in header)
        )
        is_supabase = (
            "supabase" in issuer
            or (alg == "HS256" and payload.get("sub") is not None and not is_firebase)
        )

        if is_firebase:
            return FirebaseAuthentication().authenticate(request)
        if is_supabase:
            return SupabaseAuthentication().authenticate(request)

        raise exceptions.AuthenticationFailed(
            "Unrecognised token type."
        )


class IsCustomer(permissions.BasePermission):
    """Requires an authenticated customer (Firebase UserProfile)."""

    message = "Authentication required."

    def has_permission(self, request, view):
        return isinstance(getattr(request, "user", None), UserProfile)


class IsActiveAdmin(permissions.BasePermission):
    """Requires an active authenticated admin (Supabase AdminUser)."""

    message = "Admin authentication required."

    def has_permission(self, request, view):
        admin = getattr(request, "user", None)
        return isinstance(admin, AdminUser) and admin.active


class HasPermission(permissions.BasePermission):
    """Role permission gate backed by the access-control matrix."""

    permission_code = None
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        admin = getattr(request, "user", None)
        if not isinstance(admin, AdminUser) or not admin.active:
            return False
        return role_has_permission(admin.role, self.permission_code)


class IsSuperAdmin(HasPermission):
    permission_code = "admin_users"


class IsProductManager(HasPermission):
    permission_code = "products"


class IsOrderManager(HasPermission):
    permission_code = "orders"


class IsInventoryManager(HasPermission):
    permission_code = "inventory"


class IsCouponManager(HasPermission):
    permission_code = "coupons"


class IsContentManager(HasPermission):
    permission_code = "banners"


class IsManager(HasPermission):
    permission_code = "customers"


class IsSettingsManager(HasPermission):
    permission_code = "settings"