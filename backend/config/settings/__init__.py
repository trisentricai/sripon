"""SriPon Django settings package.

The active settings module is selected via DJANGO_SETTINGS_MODULE:

- ``config.settings.development`` - local development defaults (SQLite fallback,
  DEBUG on). This is the default used by ``manage.py``.
- ``config.settings.production`` - production settings for Render (PostgreSQL,
  DEBUG off, hardened security).

Both modules inherit from :mod:`config.settings.base`.
"""