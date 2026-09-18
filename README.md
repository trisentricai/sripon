<div align="center">

# 🎆 SriPon

### A production-grade e-commerce platform for crackers & fireworks

**Four shipped surfaces. One source of truth. Built to go boom (responsibly).**

[![Django](https://img.shields.io/badge/Django-5.2-0C4B33?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/Django_REST-3.18-A30000?logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter&logoColor=white)](https://flutter.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?logo=postgresql&logoColor=white)](https://supabase.com/)
[![Redis](https://img.shields.io/badge/Redis-8-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-1.46-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)

*Python · Django · DRF · Flutter · React · TypeScript · Firebase · Supabase · Redis · Celery · Cloudinary · Render*

</div>

---

## ✨ What is SriPon?

SriPon is a complete, production-ready **online marketplace for crackers and
fireworks**. It is not a demo — it's a real full-stack platform with a working
backend, database, dual-plane authentication, a full product + cart +
checkout + payment + order lifecycle, Cloudinary image pipelines, an
admin-controlled banner/poster system, and analytics.

Four surfaces talk to **one Django REST API** that is the single source of
truth for prices, discounts, stock, cart totals, coupons, delivery, tax,
orders, payments and permissions.

| Surface | Stack | Folder | Auth |
|---|---|---|---|
| 🔌 **Backend API** | Django + DRF + Celery | `backend/` | Firebase + Supabase |
| 🖥️ **Customer website** | React + Vite + TS + Tailwind | `web/` | Firebase |
| 📊 **Admin dashboard** | React + Vite + TS + Tailwind | `admin/` | Supabase |
| 📱 **Customer app** | Flutter (Android + iOS) | `mobile/` | Firebase |

**External services:** Supabase (PostgreSQL + admin auth) · Firebase (customer
auth) · Cloudinary (images) · Redis (cache + jobs) · Render (deploy).

---

## 🏗️ Architecture at a glance

```
        ┌────────────┐   ┌────────────┐   ┌─────────────────┐
        │ Customer   │   │   Admin    │   │ Flutter app     │
        │ Web (Vite) │   │  Web (Vite)│   │ Android / iOS   │
        └─────┬──────┘   └─────┬──────┘   └────────┬────────┘
              │   Firebase     │   Supabase        │  Firebase
              │   ID tokens    │   JWTs            │  ID tokens
              └───────────────┬┴──────────────────┴──┐
                              ▼                       ▼
                 ┌───────────────────────────────────────┐
                 │       Django REST API  (Render)        │
                 │  Firebase Admin SDK · Supabase JWT     │
                 │  Cloudinary SDK · Redis · Celery       │
                 └───────────────┬───────────────────────┘
                                 ▼  DATABASE_URL (SSL)
                        ┌─────────────────────────┐
                        │  Supabase PostgreSQL     │
                        └─────────────────────────┘
```

**The backend is authoritative.** Frontends send IDs and quantities; they
receive computed prices and totals. No client is ever trusted with pricing,
discounts, stock, or role claims.

### Key design decisions

- **Dual-plane auth** — Customers carry Firebase ID tokens; admins carry
  Supabase JWTs. Django verifies *both* and enforces a role matrix server-side.
- **No overselling** — Orders reserve inventory atomically
  (`transaction.atomic()` + `select_for_update()`); delivery consumes stock;
  cancellation releases it.
- **Provider-independent payments** — a `PaymentProvider` interface with a
  `MOCK` gateway wired in; PhonePe/Razorpay/Stripe drop in behind the same
  contract. Webhook-verified, idempotent.
- **Dynamic content** — admin-controlled banners/posters (placements,
  scheduling, desktop + mobile images) and a configurable homepage CMS. Change
  a poster, and the site & app show it with **no redeploy**.
- **Cloudinary everywhere** — product images, banners, posters, avatars. Only
  metadata hits PostgreSQL; binaries never do.

---

## 🧭 Repository structure

```
SriPon/
├── backend/        Django + DRF (+ Celery) — config/ + apps/*, deployable on Render
├── web/            Customer website — React + Vite + TS + Tailwind + Firebase
├── admin/          Admin dashboard — React + Vite + TS + Tailwind + Supabase
├── mobile/         Flutter customer app — Android + iOS
├── docs/           architecture · api · database · deployment · setup
├── render.yaml     Infrastructure-as-code for Render (web + Redis)
└── README.md
```

### Backend apps

| App | Responsibility |
|-----|----------------|
| `users` | Customer + admin identities, dual-plane auth, addresses, device tokens |
| `products` | Catalogue, images, search/filter/sort, inventory + transactions |
| `categories` | Nested category trees, ordering, activation |
| `cart` | Server cart + wishlist with live price/stock recalculation |
| `orders` | Checkout, orders, price snapshots, status history, cancellation |
| `coupons` | Coupon engine with usage limits and validation |
| `payments` | Provider-independent payments, webhooks, `Payment` records |
| `banners` | Banners/posters — placements, scheduling, desktop/mobile |
| `notifications` | In-app + FCM-ready dispatch with event logging |
| `settings` | Site settings, homepage CMS, legal/compliance content |
| `analytics` | Dashboard KPIs, trends, top products/customers, category sales |

---

## ⚡ Feature highlights

- **Customer journey** — browse → search/filter → cart → address → checkout →
  order → payment → confirmation → order history & tracking.
- **Admin control** — products, categories, inventory, orders, customers,
  coupons, banners/posters, homepage, notifications, settings, admin users.
- **Role-based access** — `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `ORDER_MANAGER`,
  `PRODUCT_MANAGER`, `CONTENT_MANAGER`, `ANALYST`, enforced by the backend.
- **Analytics** — revenue, AOV, orders, trends (day/week/month), top sellers,
  category sales, with date filtering. Real data, never hard-coded.
- **Security** — rate limiting, CORS allowlists, hardened production settings,
  JSON-only rendering, structured errors, and secrets only in env vars.
- **Testing** — 316 backend tests including an end-to-end critical customer
  flow, plus Flutter widget/unit tests.

---

## 🚀 Quick start

Requirements: **Python 3.11+**, **Node 20+**, **Flutter 3.x**.

### 1 · Backend (Django)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env
python manage.py migrate
python manage.py runserver     # http://localhost:8000
```

No `DATABASE_URL`? The backend boots on SQLite + in-memory cache — zero
external config. Point it at Supabase for PostgreSQL.

### 2 · Customer website

```bash
cd web
npm install
copy .env.example .env
npm run dev                    # http://localhost:5173
```

### 3 · Admin dashboard

```bash
cd admin
npm install
copy .env.example .env
npm run dev                    # http://localhost:5174
```

### 4 · Flutter app

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1   # Android emulator
flutter run --dart-define=API_BASE_URL=http://localhost:8000/api/v1  # iOS simulator
```

---

## 🔑 Environment variables

Every secret and credential is loaded from the environment. `.env*` and
service-account files are git-ignored; `.env.example` documents each variable.

| Surface | Key variables |
|---|---|
| Backend | `DJANGO_SECRET_KEY` · `DATABASE_URL` · `REDIS_URL` · `FIREBASE_*` · `SUPABASE_*` · `CLOUDINARY_*` · `PAYMENT_*` · `CORS_ALLOWED_ORIGINS` · `THROTTLE_*` |
| Web | `VITE_API_BASE_URL` · `VITE_FIREBASE_*` |
| Admin | `VITE_API_BASE_URL` · `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY` |
| Flutter | `API_BASE_URL` (via `--dart-define`) |

Never commit real `.env` files, Firebase service-account JSONs, or `.pem` keys.

---

## ✅ Testing

```bash
# Backend (316 tests, incl. end-to-end critical flow)
cd backend && python manage.py test

# Flutter widget + unit tests
cd mobile && flutter test
```

---

## 📚 Documentation

| Doc | What it covers |
|-----|----------------|
| [Architecture](docs/architecture.md) | System design, auth flows, access-control matrix, modules |
| [API](docs/api.md) | Endpoint reference (also live at `/api/docs/`) |
| [Database](docs/database.md) | Full schema and integrity rules |
| [Deployment](docs/deployment.md) | Render, Supabase, Firebase, Cloudinary, Redis |
| [Setup](docs/setup.md) | Local development guide |

---

## 🗺️ Build history

SriPon was built in gated, verified phases — each one stable before the next:

| Phase | Delivered |
|:-----:|-----------|
| 1 | Monorepo scaffold, architecture, schema, foundations |
| 2 | Django data layer — models, admins, migrations |
| 3 | Authentication — Firebase customers + Supabase admins |
| 4 | Public products & categories catalogue |
| 5 | Cloudinary image pipeline |
| 6 | Cart & wishlist |
| 7 | Checkout & orders |
| 8 | Payments — provider-independent, MOCK gateway |
| 9 | Banners & posters (public + admin CRUD) |
| 10 | Homepage CMS |
| 11 | React customer website (all routes) |
| 12 | Admin dashboard + management + analytics |
| 13 | Flutter mobile application |
| 14 | Notifications (in-app + FCM-ready) |
| 15 | Analytics (trends, AOV, category sales, date filtering) |
| 16 | Testing (incl. end-to-end critical flow) |
| 17 | Security audit & rate limiting |
| 18 | Production deployment readiness |

---

## 🔒 Security

- All secrets in environment variables only; `.env*` and service-account files
  git-ignored.
- Production: `DEBUG=False`, HTTPS/HSTS, hardened cookies, CORS allowlists,
  JSON-only rendering, DRF throttling, centralised error handler.
- Firebase private key, Supabase service role key, Cloudinary secret, payment
  keys — **backend only**, never in web/mobile bundles.
- Customer and admin planes are fully separated (no shared token types).

---

## ⚠️ Legal & safety

Because this platform sells fireworks, compliance/notice areas (terms, safety
notices, delivery restrictions, age eligibility, return/refund policy) are
**admin-configurable** in the settings module rather than hard-coded. Location
/pincode-based order restrictions can be added without redeploying the app.

---

<div align="center">

**Built with ⭐ in phases, tested at every step.**

© SriPon. All rights reserved.

</div>