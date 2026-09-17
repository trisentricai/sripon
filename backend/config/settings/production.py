"""
Production settings for SriPon (Render).

All secrets come from environment variables. DATABASE_URL points at Supabase
PostgreSQL, REDIS_URL at Render-managed Redis. DEBUG must be off.
"""
from .base import *  # noqa: F401,F403
from .base import ALLOWED_HOSTS, DEBUG, env_bool, os

DEBUG = False

if not os.getenv("DJANGO_SECRET_KEY") or "dev-only" in os.getenv(
    "DJANGO_SECRET_KEY", ""
):
    import sys

    print(
        "ERROR: DJANGO_SECRET_KEY is missing or insecure in production.",
        file=sys.stderr,
    )
    sys.exit(1)

if not os.getenv("DATABASE_URL"):
    import sys

    print(
        "ERROR: DATABASE_URL is required in production (Supabase PostgreSQL).",
        file=sys.stderr,
    )
    sys.exit(1)

# ---- Security hardening -----------------------------------------------------
SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
CORS_ALLOW_ALL_ORIGINS = False

# ---- Static -----------------------------------------------------------------
STATICFILES_STORAGE = (
    "whitenoise.storage.CompressedManifestStaticFilesStorage"
)

# ---- Logging -----------------------------------------------------------------
LOG_LEVEL = "INFO"

# ---- Email (real SMTP only when configured) ----------------------------------
if os.getenv("EMAIL_HOST_USER"):
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
    EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
    DEFAULT_FROM_EMAIL = os.getenv("EMAIL_HOST_USER")