# SriPon

**SriPon** is a production-grade e-commerce platform for crackers & fireworks,
built as a monorepo with four shipped surfaces and a Django REST API as the
single source of truth.

| Surface | Tech | Folder |
|---|---|---|
| Backend API | Django + Django REST Framework + Celery | `backend/` |
| Customer website | React + Vite + Tailwind CSS + Firebase | `web/` |
| Admin dashboard | React + Vite + TypeScript + Tailwind + Supabase Auth | `admin/` |
| Customer app | Flutter (Android + iOS), Riverpod/Bloc-ready | `mobile/` |

External services: **Supabase** PostgreSQL + admin auth, **Firebase**
customer auth, **Cloudinary** images, **Redis** caching/background jobs,
**Render** deployment.

## Highlights

- Backend is the source of truth for pricing, discounts, stock, cart totals,
  coupons, delivery fees, tax, order totals, payment and order status.
- Dual-plane authentication: Firebase ID tokens for customers, Supabase JWTs
  for admins — both verified in Django; roles enforced server-side.
- Admin-controlled promotional **banner/poster** system with placements,
  scheduling, desktop + mobile images, and dynamic homepage sections.
- Full order lifecycle with status history, inventory reservation (no
  overselling), provider-independent payment module with webhook
  verification, coupons, and analytics.
- Cloudinary-backed image pipeline (no binary blobs in PostgreSQL).

## Repository structure

```
backend/   Django + DRF apps (users, products, categories, cart, orders,
           banners, coupons, payments, notifications, settings) + config/
web/       Customer website (Vite + React + TS)
admin/     Admin dashboard (Vite + React + TS)
mobile/    Flutter customer application
docs/      architecture.md · api.md · database.md · deployment.md · setup.md
render.yaml
```

## Get started

```bash
# 1. Backend
cd backend
python -m venv venv && venv\Scripts\activate   # or source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                          # cp on macOS/Linux; fill values
python manage.py migrate
python manage.py runserver                      # http://localhost:8000

# 2. Customer website
cd web
npm install
copy .env.example .env
npm run dev                                     # http://localhost:5173

# 3. Admin dashboard
cd admin
npm install
copy .env.example .env
npm run dev                                     # http://localhost:5174

# 4. Flutter app
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

Details for every step, plus provisioning of Supabase, Firebase, Cloudinary,
Redis and Render are in [`docs/setup.md`](docs/setup.md) and
[`docs/deployment.md`](docs/deployment.md).

## Documentation

- [Architecture](docs/architecture.md) — system design, auth flows, permissions
- [Database](docs/database.md) — full schema and integrity rules
- [API](docs/api.md) — endpoint reference (also live at `/api/docs/`)
- [Deployment](docs/deployment.md) — Render, Supabase, Firebase, Cloudinary, Redis
- [Setup](docs/setup.md) — local development

## Security

- All secrets live in environment variables; `.env*` and service-account
  files are git-ignored. `.env.example` documents every variable.
- Production enforces `DEBUG=False`, HTTPS/HSTS, hardened cookies, CORS
  allowlists, DRF throttling and a centralised exception handler.
- Firewalls: Firebase private key, Supabase service role key, Cloudinary
  secret, payment keys — **backend only**, never in web/mobile bundles.
- See `docs/architecture.md` for the full access-control matrix.

## Development phases

This repository is built in gated phases (see the build specifications in
`docs/`): every phase is verified before the next begins. Current status is
tracked in the project changelog in `README.md` history / commits.

## License

Proprietary. © SriPon. All rights reserved.