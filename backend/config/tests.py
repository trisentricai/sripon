import os
from unittest.mock import patch

import dj_database_url
from django.conf import settings
from django.test import SimpleTestCase, TestCase

from config.settings.base import env_bool, env_list


class DatabaseUrlConfigTests(SimpleTestCase):
    """Verifies the production config path: Supabase PostgreSQL via DATABASE_URL."""

    def test_supabase_url_parses_with_ssl(self):
        url = "postgresql://sripon:secret@db.supabase.co:5432/postgres?sslmode=require"
        config = dj_database_url.parse(
            url,
            conn_max_age=600,
            ssl_require=True,
        )
        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "postgres")
        self.assertEqual(config["HOST"], "db.supabase.co")
        self.assertEqual(config["PORT"], 5432)
        self.assertEqual(config["CONN_MAX_AGE"], 600)
        self.assertEqual(config["OPTIONS"]["sslmode"], "require")

    def test_development_database_selection(self):
        """SQLite is the zero-config fallback; DATABASE_URL selects Postgres."""
        if os.getenv("DATABASE_URL"):
            self.assertEqual(
                settings.DATABASES["default"]["ENGINE"],
                "django.db.backends.postgresql",
            )
        else:
            self.assertEqual(
                settings.DATABASES["default"]["ENGINE"],
                "django.db.backends.sqlite3",
            )


class EnvHelperTests(SimpleTestCase):
    def test_env_bool_parses_common_values(self):
        with patch.dict(os.environ, {"SP_TEST_TRUE": "1", "SP_TEST_YES": "yes"}, clear=False):
            self.assertTrue(env_bool("SP_TEST_TRUE", False))
            self.assertTrue(env_bool("SP_TEST_YES", False))
        self.assertFalse(env_bool("SP_TEST_MISSING", False))
        self.assertTrue(env_bool("SP_TEST_MISSING", True))

    def test_env_list_parses_csv(self):
        with patch.dict(
            os.environ,
            {"SP_TEST_LIST": "a, b , c"},
            clear=False,
        ):
            self.assertEqual(env_list("SP_TEST_LIST"), ["a", "b", "c"])
        self.assertEqual(env_list("SP_TEST_EMPTY", "default"), ["default"])


class DeploymentReadinessTests(TestCase):
    """Verifies the surfaces Render relies on: health probe, API schema, seed cmd."""

    def test_health_endpoint_returns_ok(self):
        from django.test import Client

        response = Client().get("/health/")
        self.assertEqual(response.status_code, 200)

    def test_openapi_schema_generates(self):
        from django.test import Client

        response = Client().get("/api/schema/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("openapi", response.data)

    def test_api_docs_are_served(self):
        from django.test import Client

        self.assertEqual(Client().get("/api/docs/").status_code, 200)

    def test_seed_superadmin_creates_admin(self):
        from io import StringIO

        from django.core.management import call_command

        from apps.users.models import AdminUser

        out = StringIO()
        call_command(
            "seed_superadmin",
            "--supabase-uid",
            "dep-uid-1",
            "--email",
            "Ops@SriPon.In",
            "--name",
            "Ops",
            stdout=out,
        )
        admin = AdminUser.objects.get(supabase_uid="dep-uid-1")
        self.assertEqual(admin.email, "ops@sripon.in")
        self.assertEqual(admin.role, AdminUser.Role.SUPER_ADMIN)
        self.assertTrue(admin.active)

    def test_seed_superadmin_is_idempotent(self):
        from io import StringIO

        from django.core.management import call_command

        from apps.users.models import AdminUser

        args = ["--supabase-uid", "dep-uid-2", "--email", "again@sripon.in"]
        for _ in range(2):
            call_command("seed_superadmin", *args, stdout=StringIO())
        self.assertEqual(AdminUser.objects.filter(supabase_uid="dep-uid-2").count(), 1)