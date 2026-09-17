from .models import AdminUser

ROLE_PERMISSIONS = {
    AdminUser.Role.SUPER_ADMIN: {
        "products",
        "categories",
        "inventory",
        "orders",
        "customers",
        "coupons",
        "banners",
        "homepage",
        "payments",
        "settings",
        "admin_users",
        "analytics",
    },
    AdminUser.Role.ADMIN: {
        "products",
        "categories",
        "inventory",
        "orders",
        "customers",
        "coupons",
        "banners",
        "homepage",
        "payments",
        "settings",
        "analytics",
    },
    AdminUser.Role.MANAGER: {
        "products",
        "categories",
        "inventory",
        "orders",
        "customers",
        "coupons",
        "banners",
        "homepage",
        "payments",
        "analytics",
    },
    AdminUser.Role.ORDER_MANAGER: {
        "orders",
        "customers",
        "payments",
        "analytics",
    },
    AdminUser.Role.PRODUCT_MANAGER: {
        "products",
        "categories",
        "inventory",
        "analytics",
    },
    AdminUser.Role.CONTENT_MANAGER: {
        "banners",
        "homepage",
        "analytics",
    },
    AdminUser.Role.ANALYST: {"analytics"},
}


def role_has_permission(role: str, permission: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return permission in perms