from django.db import models

from apps.common.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    """Customer profile keyed by the Firebase UID (identity lives in Firebase)."""

    firebase_uid = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    profile_image = models.JSONField(default=dict, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Customer profile"
        verbose_name_plural = "Customer profiles"

    def __str__(self):
        return self.name or self.email or self.firebase_uid


class AdminUser(TimeStampedModel):
    """Internal admin account mapped to a Supabase Auth identity."""

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        ORDER_MANAGER = "ORDER_MANAGER", "Order Manager"
        PRODUCT_MANAGER = "PRODUCT_MANAGER", "Product Manager"
        CONTENT_MANAGER = "CONTENT_MANAGER", "Content Manager"
        ANALYST = "ANALYST", "Analyst"

    supabase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.ADMIN,
    )
    active = models.BooleanField(default=True)
    last_login = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Admin user"
        verbose_name_plural = "Admin users"

    def __str__(self):
        return f"{self.name} ({self.role})"


class Address(TimeStampedModel):
    """Saved shipping address belonging to a customer."""

    customer = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="addresses",
    )
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10, db_index=True)
    landmark = models.CharField(max_length=255, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def save(self, *args, **kwargs):
        if self.is_default:
            Address.objects.filter(
                customer_id=self.customer_id, is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} - {self.address_line_1}, {self.city} {self.pincode}"


class DeviceToken(models.Model):
    """Push-notification token for a customer's mobile/web app."""

    class Platform(models.TextChoices):
        ANDROID = "ANDROID", "Android"
        IOS = "IOS", "iOS"
        WEB = "WEB", "Web"

    customer = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="device_tokens",
    )
    token = models.CharField(max_length=256, unique=True)
    platform = models.CharField(
        max_length=20,
        choices=Platform.choices,
        default=Platform.ANDROID,
    )
    app_version = models.CharField(max_length=50, blank=True)
    active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.platform} token for {self.customer}"