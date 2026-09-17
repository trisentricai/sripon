"""
Base Django settings shared by every environment.

Environment variables are read from a backend/.env file when present.
Concrete deployments import this module from ``development.py`` or
``production.py`` and override the deployment-specific knobs.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from backend/.env (ignored by git).
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    """Parse a boolean environment variable, tolerating 1/0/true/false/yes/no."""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    """Parse a comma-separated environment variable into a list."""
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# Core Django
# ---------------------------------------------------------------------------

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-secret-key")
DEBUG = env_bool("DJANGO_DEBUG", False)

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    "localhost,127.0.0.1,.onrender.com",
)

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS", "")

INSTALLED_APPS = [
    # Django builtins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    # SriPon apps
    "apps.common",
    "apps.users",
    "apps.categories",
    "apps.products",
    "apps.cart",
    "apps.orders",
    "apps.banners",
    "apps.coupons",
    "apps.payments",
    "apps.notifications",
    "apps.settings",
    "apps.analytics",
]

MIDDLEWARE = [
    # Security headers first so every downstream response is covered.
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# ---------------------------------------------------------------------------
# Database
#
# Production (Supabase PostgreSQL) uses DATABASE_URL, e.g.
#   postgresql://user:pass@host:5432/postgres?sslmode=require
# Local development falls back to SQLite when DATABASE_URL is unset so the
# project boots with zero external configuration.
# ---------------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

if os.getenv("DATABASE_URL"):
    import dj_database_url

    DATABASES["default"] = dj_database_url.parse(
        os.getenv("DATABASE_URL"),
        conn_max_age=600,
        ssl_require=env_bool("DATABASE_SSL_REQUIRE", True),
    )

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Caching & background tasks
#
# REDIS_URL (Render Redis / Redis Cloud) powers the cache layer and Celery
# broker. With no REDIS_URL we degrade to local-memory caching so local dev
# needs no external service.
# ---------------------------------------------------------------------------

REDIS_URL = os.getenv("REDIS_URL")

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "sripon-local",
        }
    }

# --- Celery -----------------------------------------------------------------
try:
    from celery import Celery  # noqa: F401

    CELERY_BROKER_URL = REDIS_URL or "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND = REDIS_URL or "redis://localhost:6379/1"
    CELERY_TASK_SERIALIZER = "json"
    CELERY_ACCEPT_CONTENT = ["json"]
    CELERY_RESULT_SERIALIZER = "json"
    CELERY_TIMEZONE = "Asia/Kolkata"
    CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
except ImportError:  # pragma: no cover - celery is in requirements
    pass

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Session auth is useful for browsable API / Django admin testing.
        "rest_framework.authentication.SessionAuthentication",
        # Routes bearer tokens to Firebase (customer) or Supabase (admin).
        "apps.users.authentication.SriPonApiAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("THROTTLE_ANON", "100/min"),
        "user": os.getenv("THROTTLE_USER", "300/min"),
        "login": os.getenv("THROTTLE_LOGIN", "10/min"),
        "coupon": os.getenv("THROTTLE_COUPON", "20/min"),
        "checkout": os.getenv("THROTTLE_CHECKOUT", "10/min"),
        "payment": os.getenv("THROTTLE_PAYMENT", "10/min"),
    },
    "EXCEPTION_HANDLER": "config.exceptions.api_exception_handler",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SriPon API",
    "DESCRIPTION": (
        "REST API for the SriPon crackers & fireworks marketplace. "
        "Customer endpoints accept Firebase ID tokens; admin endpoints "
        "accept Supabase JWTs. See the auth section in the docs."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "TAGS": [
        {"name": "auth", "description": "Customer & admin authentication"},
        {"name": "products", "description": "Product browsing, search & filters"},
        {"name": "categories", "description": "Product categories"},
        {"name": "banners", "description": "Promotional banners & posters"},
        {"name": "cart", "description": "Shopping cart"},
        {"name": "wishlist", "description": "Wishlist"},
        {"name": "orders", "description": "Orders & checkout"},
        {"name": "coupons", "description": "Coupons & discounts"},
        {"name": "payments", "description": "Payments"},
        {"name": "admin", "description": "Admin-only endpoints"},
        {"name": "customers", "description": "Customer management"},
        {"name": "home", "description": "CMS-driven homepage"},
    ],
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    origin.rstrip("/")
    for origin in env_list(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174,http://localhost:3000",
    )
]
if env_bool("CORS_ALLOW_ALL_ORIGINS", False):
    CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Security (hardened further in production.py)
# ---------------------------------------------------------------------------

SECURE_REFERRER_POLICY = "same-origin"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# ---------------------------------------------------------------------------
# Static & media
#
# Media (product images, banners) is never stored locally in production -
# Cloudinary is the store of truth (Phase 5). Local dev can write to disk.
# ---------------------------------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Cloudinary credentials (used by apps.* storage utilities from Phase 5).
CLOUDINARY = {
    "CLOUD_NAME": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    "API_KEY": os.getenv("CLOUDINARY_API_KEY", ""),
    "API_SECRET": os.getenv("CLOUDINARY_API_SECRET", ""),
    "SECURE": env_bool("CLOUDINARY_SECURE", True),
    "FOLDER": os.getenv("CLOUDINARY_FOLDER", "sripon"),
}

# Payment gateway (Phase 8). Backend-only secrets; selected by PAYMENT_PROVIDER.
PAYMENT = {
    "PROVIDER": os.getenv("PAYMENT_PROVIDER", "MOCK"),
    "MOCK_SECRET": os.getenv("PAYMENT_MOCK_SECRET", "mock-secret-dev"),
}

# ---------------------------------------------------------------------------
# Firebase (customer identity) & Supabase (admin identity)
# ---------------------------------------------------------------------------

FIREBASE = {
    "PROJECT_ID": os.getenv("FIREBASE_PROJECT_ID", ""),
    "CLIENT_EMAIL": os.getenv("FIREBASE_CLIENT_EMAIL", ""),
    "PRIVATE_KEY": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
    "SERVICE_ACCOUNT_PATH": os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", ""),
}

SUPABASE = {
    "URL": os.getenv("SUPABASE_URL", ""),
    "ANON_KEY": os.getenv("SUPABASE_ANON_KEY", ""),
    "SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
    "JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET", ""),
    "JWT_AUDIENCE": os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
}

# ---------------------------------------------------------------------------
# Payments (provider-independent, Phase 8)
# ---------------------------------------------------------------------------

PAYMENTS = {
    "PROVIDER": os.getenv("PAYMENT_PROVIDER", "MOCK").upper(),
    "MERCHANT_ID": os.getenv("PAYMENT_MERCHANT_ID", ""),
    "SALT_KEY": os.getenv("PAYMENT_SALT_KEY", ""),
    "SALT_INDEX": os.getenv("PAYMENT_SALT_INDEX", "1"),
    "CALLBACK_URL": os.getenv("PAYMENT_CALLBACK_URL", ""),
}

# ---------------------------------------------------------------------------
# Store configuration (mirrors apps.settings SiteSetting where overridable)
# ---------------------------------------------------------------------------

CURRENCY = os.getenv("CURRENCY", "INR")
STORE_NAME = os.getenv("STORE_NAME", "SriPon")
STORE_EMAIL = os.getenv("STORE_EMAIL", "support@sripon.in")
STORE_PHONE = os.getenv("STORE_PHONE", "")

# ---------------------------------------------------------------------------
# Logging
#
# Never log secrets: secrets are not written anywhere in the logging
# formatters and credentials are excluded from sensitive logging calls.
# ---------------------------------------------------------------------------

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": (
                "{levelname} {asctime} {module} {process:d} {thread:d} "
                "{message}"
            ),
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {asctime} {module}: {message}",
            "style": "{",
        },
    },
    "filters": {
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "mail_admins": {
            "level": "ERROR",
            "class": "django.utils.log.AdminEmailHandler",
            "filters": ["require_debug_false"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": LOG_LEVEL,
        },
        "django.request": {
            "handlers": ["console", "mail_admins"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        # SriPon application loggers (one per domain, Phase 44 expands these)
        "apps.payments": {"handlers": ["console"], "level": LOG_LEVEL},
        "apps.orders": {"handlers": ["console"], "level": LOG_LEVEL},
        "apps.users": {"handlers": ["console"], "level": LOG_LEVEL},
        "apps.products": {"handlers": ["console"], "level": LOG_LEVEL},
    },
}