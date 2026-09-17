import os
from unittest.mock import patch

import dj_database_url
from django.conf import settings
from django.test import SimpleTestCase

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

    def test_development_falls_back_to_sqlite(self):
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