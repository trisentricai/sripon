"""
Development settings for SriPon.

Used by default from ``manage.py``. Boots with zero external services:
Django uses SQLite and local-memory caching when DATABASE_URL / REDIS_URL
are unset, which keeps onboarding friction low.
"""
from .base import *  # noqa: F401,F403
from .base import env_bool, os

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Permissive CORS for local frontends (web on :5173, admin on :5174).
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Show full introspection on the browsable API in development.
REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"].append(  # noqa: F405
    "rest_framework.renderers.BrowsableAPIRenderer"
)

# In-memory SQLite by default; override with DATABASE_URL when running against
# a local or Supabase Postgres.
if not os.getenv("DATABASE_URL"):
    DATABASES = {  # noqa: F405
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",  # noqa: F405
        }
    }

LOG_LEVEL = "DEBUG"

# Development helper switch kept explicit even though DEBUG is on.
DISABLE_SILK = env_bool("DISABLE_SILK", True)  # reserved for profiler integration