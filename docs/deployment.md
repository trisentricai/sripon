# SriPon Deployment Guide

## 1. Overview

| Surface | Host | Notes |
|---|---|---|
| Backend | Render Web Service | Gunicorn + Django, migrations on boot |
| Redis | Render Redis | cache + Celery broker |
| PostgreSQL | Supabase | `DATABASE_URL` with `sslmode=require` |
| Customer/Admin Web | Vercel / Netlify / Render static | built SPAs |
| Images | Cloudinary | uploads + transformations |
| Auth | Firebase (customers) + Supabase Auth (admins) | tokens verified in Django |
| Mobile | Play Store / App Store | Flutter release builds |

`render.yaml` at the repo root describes the backend + Redis for one-command
Render setup.

## 2. Supabase provisioning

1. Create a project at https://supabase.com.
2. Database → Connection string. Copy the **URI (pooled or direct)**:
   `postgresql://postgres.XXX:password@aws-0-...:5432/postgres`. Append
   `?sslmode=require`.
3. Expose to Django as `DATABASE_URL`. Use pooled connections in production.
4. Keep the **anon key** and **service role key** (Dashboard → Settings → API).
   The service role key and the JWT secret are **backend-only** secrets.
5. Supabase handles auth for admins automatically (email/password + optional
   magic link). Roles are enforced by Django's `AdminUser`, not Supabase.

## 3. Firebase provisioning (customers)

1. Create a Firebase project → add a **Web app** (for the website) and
   Android/iOS apps (for Flutter). Collect each app's web config.
2. Authentication → enable Email/Password (and Google, Phone if desired).
3. Project settings → Service accounts → **Generate new private key**.
4. The service-account JSON is uploaded to Render as an environment variable
   bundle or copied into `FIREBASE_*` env vars:
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` (client_email),
     `FIREBASE_PRIVATE_KEY` (private_key). Keep `\n` escaping intact.
5. Download `google-services.json` (Android) and
   `GoogleService-Info.plist` (iOS) into `mobile/android/app/` and
   `mobile/ios/Runner/` for the mobile app.
6. Web: copy config values into `web/.env` (`VITE_FIREBASE_*`).

The private key never ships in the web/mobile bundles.

## 4. Cloudinary provisioning

1. Create a Cloudinary account → note `CLOUD_NAME`, `API_KEY`, `API_SECRET`.
2. Backend env vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER=sripon`.
3. All uploads happen server-side (product/banner images) or via server-signed
   uploads. Clients never hold the API secret.

## 5. Render backend

1. Push the repo to GitHub/GitLab and create a New Web Service from
   `backend/` (or use `render.yaml` blueprints).
2. Settings:
   - Build command: `pip install -r requirements.txt`
   - Start command:
     `gunicorn config.wsgi:application --workers 2 --timeout 120 --bind 0.0.0.0:$PORT`
   - Pre-deploy / on boot run migrations -
     render.yaml uses a `preDeployCommand`: `python manage.py migrate
     --noinput && python manage.py collectstatic --noinput`
3. Environment:
   - `DJANGO_SETTINGS_MODULE=config.settings.production`
   - `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`
   - `DATABASE_URL`, `REDIS_URL`, `CORS_ALLOWED_ORIGINS`
   - Firebase, Supabase, Cloudinary and payment variables.
4. Create the first admin via a one-off shell:
   `python manage.py seed_superadmin` (created in Phase 3).

### render.yaml (backend web service)

```yaml
services:
  - type: web
    name: sripon-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn config.wsgi:application --workers 2 --timeout 120 --bind 0.0.0.0:$PORT
    preDeployCommand: python manage.py migrate --noinput && python manage.py collectstatic --noinput
    healthCheckPath: /health/
    envVars: [...]
  - type: redis
    name: sripon-redis
    plan: free
    maxmemoryPolicy: allkeys-lru
```

## 6. Redis

- Add a Render Redis instance; use its internal URL for `REDIS_URL` when the
  backend and Redis share the region, or the public URL otherwise.
- Celery workers are optional at launch; when added, start
  `celery -A config worker -l info` in a background worker service.

## 7. Web + admin SPA deployment

1. Build with `npm install && npm run build` (outputs `dist/`).
2. Vercel: set the frameworks preset (Vite), output `dist`, env vars
   `VITE_API_BASE_URL` etc. per project.
3. Ensure `VITE_API_BASE_URL` points at the public backend URL and the origin
   is listed in backend `CORS_ALLOWED_ORIGINS`.

## 8. Flutter release builds

Android:

```bash
cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://api.sripon.in/api/v1
flutter build appbundle --release --dart-define=API_BASE_URL=https://api.sripon.in/api/v1
```

iOS:

```bash
cd mobile
flutter build ios --release --dart-define=API_BASE_URL=https://api.sripon.in/api/v1
```

- Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
  before building so Firebase sign-in works.
- All environment-specific configuration flows through `--dart-define`
  (`AppEnv` in `lib/config/env.dart`).

## 9. Production checklist

- [ ] `DEBUG=false` and a strong `DJANGO_SECRET_KEY`.
- [ ] HTTPS everywhere; HSTS on; CORS restricted to real origins.
- [ ] Supabase pooled `DATABASE_URL` with `sslmode=require`.
- [ ] `REDIS_URL` attached (cache + Celery).
- [ ] Firebase service account private key only in backend env.
- [ ] Supabase service role key / JWT secret only in backend env.
- [ ] Cloudinary API secret only in backend env.
- [ ] Payment credentials only in backend env.
- [ ] Migrations run; `collectstatic` run; `/health/` green.
- [ ] First admin user exists.
- [ ] Banners, products, categories ingested through the admin UI.