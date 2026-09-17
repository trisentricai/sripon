from rest_framework import serializers

from .models import Address, DeviceToken, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "id",
            "firebase_uid",
            "name",
            "email",
            "phone",
            "profile_image",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("firebase_uid", "created_at", "updated_at")


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id",
            "full_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "district",
            "state",
            "pincode",
            "landmark",
            "is_default",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        if attrs.get("is_default"):
            has_default = Address.objects.filter(
                customer_id=self.context.get("customer_id"),
                is_default=True,
            ).exists()
            if has_default and self.instance is None:
                attrs["is_default"] = False
        return attrs


class AuthTokenSerializer(serializers.Serializer):
    token = serializers.CharField(write_only=True)

    def validate_token(self, value):
        if not value or len(value) > 4096:
            raise serializers.ValidationError("A valid token is required.")
        return value


class DeviceTokenSerializer(serializers.ModelSerializer):
    token = serializers.CharField(max_length=256)

    class Meta:
        model = DeviceToken
        fields = ("token", "platform", "app_version")

    def validate_token(self, value):
        if not value or len(value) > 256:
            raise serializers.ValidationError("A valid device token is required.")
        return value