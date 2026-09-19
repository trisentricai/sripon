"""Customer and admin authentication endpoints (Phase 3)."""
from rest_framework import permissions, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.response import Response
from rest_framework.views import APIView

from config.pagination import success_response
from config.throttles import LoginThrottle

from .authentication import (
    FirebaseAuthentication,
    IsCustomer,
    SupabaseAuthentication,
    _verify_firebase_token,
    sync_user_from_firebase_claims,
)
from .models import Address, AdminUser, DeviceToken
from .permissions import ROLE_PERMISSIONS
from .serializers import (
    AddressSerializer,
    AuthTokenSerializer,
    DeviceTokenSerializer,
    UserProfileSerializer,
)

CUSTOMER_AUTH = [FirebaseAuthentication, SessionAuthentication]
ADMIN_AUTH = [SupabaseAuthentication, SessionAuthentication]


class FirebaseAuthView(APIView):
    """POST /auth/firebase/verify/ - exchange a Firebase ID token for a
    customer profile."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginThrottle]

    def get_authenticate_header(self, request):
        return "Bearer"

    def post(self, request):
        serializer = AuthTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        claims = _verify_firebase_token(serializer.validated_data["token"])
        profile, created = sync_user_from_firebase_claims(claims)

        data = UserProfileSerializer(profile).data
        data["auth"] = {
            "verified": True,
            "is_new": created,
            "uid": claims["uid"],
            "email_verified": bool(claims.get("email_verified", False)),
        }
        message = "Welcome to SriPon." if created else "Welcome back to SriPon."
        return success_response(data, message=message)


class GoogleAuthView(FirebaseAuthView):
    """POST /auth/google/ - Google sign-in issues a Firebase ID token, so the
    flow is identical to the Firebase verify endpoint."""


class AdminAuthView(APIView):
    """GET /auth/admin/verify/ - verify a Supabase JWT and return the admin
    payload (used by the dashboard on boot)."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        admin = request.user
        if not isinstance(admin, AdminUser):
            raise AuthenticationFailed("Admin authentication required.")
        return success_response(
            {
                "id": admin.pk,
                "email": admin.email,
                "name": admin.name,
                "role": admin.role,
                "active": admin.active,
                "permissions": sorted(ROLE_PERMISSIONS.get(admin.role, set())),
            },
            message=f"Authenticated as {admin.name}.",
        )


class MeView(APIView):
    """GET/PATCH /auth/me/ - current customer profile."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def get(self, request):
        return success_response(UserProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, message="Profile updated.")


class DeviceTokenView(APIView):
    """POST /auth/me/device-token/ - register an FCM device token."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token, created = DeviceToken.objects.update_or_create(
            token=serializer.validated_data["token"],
            defaults={
                "customer": request.user,
                "platform": serializer.validated_data.get(
                    "platform", DeviceToken.Platform.ANDROID
                ),
                "app_version": serializer.validated_data.get("app_version", ""),
                "active": True,
            },
        )
        return success_response(
            {"registered": True, "created": created, "id": token.pk},
            message="Device token registered.",
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AddressViewSet(viewsets.ModelViewSet):
    """User-scoped CRUD for saved shipping addresses."""

    serializer_class = AddressSerializer
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return Address.objects.filter(customer=self.request.user).order_by(
            "-is_default", "-updated_at"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["customer_id"] = self.request.user.pk
        return context

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=["post"], url_path="default")
    def set_default(self, request, pk=None):
        address = self.get_object()
        Address.objects.filter(
            customer=request.user, is_default=True
        ).exclude(pk=address.pk).update(is_default=False)
        address.is_default = True
        address.save(update_fields=["is_default", "updated_at"])
        return success_response(
            AddressSerializer(address).data,
            message="Default address updated.",
        )