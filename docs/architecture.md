# SriPon Architecture

SriPon is a production-grade e-commerce platform for crackers & fireworks.
It ships as a monorepo with four deployable surfaces and a Django REST API as
the single source of truth for all business logic.

## 1. System overview

```
┌────────────────────────────┐
│   Django REST API (Render) │
│   Firebase Admin SDK       │  ← verify customer ID tokens
│   Supabase JWT verification│  ← verify admin JWTs
│   Cloudinary SDK           │  ← image CRUD + transformations
│   Redis                    │  ← cache, rate limiting, Celery broker
│   Celery                   │  ← background jobs
└───────────┬────────────────┘
            │ DATABASE_URL (SSL)
            ▼
   ┌────────────────────┐
   │ Supabase PostgreSQL│
   └────────────────────┘

┌───────────────┐  ┌───────────────┐  ┌─────────────────────────┐
│ Customer Web  │  │  Admin Web    │  │  Customer Flutter app   │
│ React + Vite  │  │ React + Vite  │  │  Android / iOS          │
│ Firebase Auth │  │ Supabase Auth │  │  Firebase Auth          │
└───────┬───────┘  └───────┬───────┘  └──────────┬──────────────┘
        └──────────────────┼─────────────────────┘
                           │ HTTPS, JSON REST
                           ▼
              ┌────────────────────────┐
              │   Django REST API     │  ← single source of truth
              └────────────────────────┘
```

- The **backend is authoritative** for prices, discounts, stock, cart totals,
  coupon validation, delivery fees, tax, order totals, payment status, order
  status and permissions.
- Frontends never send computed totals or role claims; they send IDs and
  quantities and receive calculated values back.
- Secrets live only in backend environment variables / Render. Web, admin and
  mobile apps never possess payment, Cloudinary or database credentials.

## 2. Monorepo layout

```
SriPon/
├── backend/    Django + DRF (+ Celery), deployable on Render
├── web/        Customer website (React + Vite + Tailwind + Firebase)
├── admin/      Admin dashboard (React + Vite + TS + Tailwind + Supabase)
├── mobile/     Flutter customer app
├── docs/       Architecture, API, database, deployment, setup
├── render.yaml Infrastructure-as-code for Render
└── README.md
```

## 3. Identity & access control

### 3.1 Customer identity — Firebase Authentication

- Customers authenticate **only with Firebase** (email/password, Google,
  optional phone).
- Firebase issues an ID token. Customer API requests carry it as
  `Authorization: Bearer <id_token>`.
- Django verifies the ID token with the **Firebase Admin SDK** (service
  account credentials supplied through environment variables).
- On first verified login Django creates/syncs a `UserProfile` keyed by the
  Firebase UID. Django never stores passwords.
- `apps/users/authentication.py` provides `FirebaseAuthentication` (a DRF
  authentication class) and the `IsCustomer` permission.

### 3.2 Admin identity — Supabase Auth

- Admins sign in through Supabase from the dashboard (email/password, optional
  magic link).
- The dashboard attaches the Supabase JWT as a bearer token to Django.
- Django verifies the JWT signature with `SUPABASE_JWT_SECRET` and maps the
  Supabase user to an `AdminUser` record carrying a role.
- Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `ORDER_MANAGER`,
  `PRODUCT_MANAGER`, `CONTENT_MANAGER`, `ANALYST`.
- `apps/users/authentication.py` provides `SupabaseAuthentication`,
  `IsAdmin`, and granular role permissions
  (e.g. `IsProductManager`).

### 3.3 Access control matrix

| Capability             | SUPER_ADMIN | ADMIN | MANAGER | ORDER_MGR | PRODUCT_MGR | CONTENT_MGR | ANALYST |
|------------------------|:-----------:|:-----:|:-------:|:---------:|:-----------:|:-----------:|:-------:|
| Dashboard & analytics  | ✅          | ✅    | ✅      | ✅        | ✅          | ✅          | ✅ (RO) |
| Product CRUD           | ✅          | ✅    | ✅      | –         | ✅          | –           | –       |
| Categories             | ✅          | ✅    | ✅      | –         | ✅          | –           | –       |
| Inventory              | ✅          | ✅    | ✅      | –         | ✅          | –           | –       |
| Orders                 | ✅          | ✅    | ✅      | ✅        | –           | –           | –       |
| Customers (order-scope)| ✅          | ✅    | ✅      | ✅        | –           | –           | –       |
| Coupons                | ✅          | ✅    | ✅      | –         | –           | –           | –       |
| Banners / posters      | ✅          | ✅    | ✅      | –         | –           | ✅          | –       |
| Homepage CMS           | ✅          | ✅    | ✅      | –         | –           | ✅          | –       |
| Settings               | ✅          | ✅    | –       | –         | –           | –           | –       |
| Admin users            | ✅          | –     | –       | –         | –           | –           | –       |
| Payments / refunds     | ✅          | ✅    | ✅      | ✅        | –           | –           | –       |

The backend enforces the matrix; frontend route guards only improve UX.

## 4. Modules (Django apps)

| App | Responsibility |
|-----|----------------|
| `apps.users` | `UserProfile`, `AdminUser`, Firebase + Supabase authentication, profile sync |
| `apps.categories` | Nested categories, sort order, activation |
| `apps.products` | Products, images, search/filter/sort, inventory logic, reviews-ready |
| `apps.cart` | Server cart for customers, price/stock recalculation |
| `apps.orders` | Orders, order items (price snapshots), status history, address book, invoice |
| `apps.banners` | Banners/posters, placements, scheduling, desktop/mobile images, priority |
| `apps.coupons` | Coupon engine with usage limits and validation |
| `apps.payments` | Provider-independent payment service, webhooks, Payment records |
| `apps.notifications` | Notification architecture, FCM-ready broadcast scaffold |
| `apps.settings` | Site settings, homepage sections, legal/compliance content |
| `config` | Settings, URL routing, pagination, exception handling, Celery, WSGI/ASGI |

## 5. Backend request path

1. Middleware: security headers, whitenoise, CORS, sessions, CSRF.
2. Routers under `/api/v1/` dispatch to DRF view sets.
3. Authentication classes decode the bearer token (`Firebase` or `Supabase`)
   and populate `request.user`/`request.admin`.
4. Permissions check customer vs. admin and role granularity.
5. Serializers validate input; views enforce business rules (stock, prices,
   coupon validity).
6. Orders/payments/inventory run inside `transaction.atomic()` with
   `select_for_update()` to prevent race conditions.
7. List endpoints paginate (PageNumberPagination) and filter via
   `django-filter` + DRF search/ordering backends.
8. Every error is normalised by `config.exceptions.api_exception_handler`
   into `{success, message, errors}`.

## 6. API surface (v1)

Full contract: see `docs/api.md` and the OpenAPI schema at
`GET /api/schema/` (interactive: `GET /api/docs/`).

Notable groups:

```
/api/v1/auth/me/            customer profile (Firebase)
/api/v1/products/           public catalogue + search/filter/sort
/api/v1/categories/         public categories (tree)
/api/v1/banners/?placement= public active banners by placement
/api/v1/cart/…              customer cart (auth)
/api/v1/wishlist/…          wishlist (auth)
/api/v1/orders/…            orders + checkout (auth)
/api/v1/coupons/validate/   coupon validation (auth)
/api/v1/payments/…          payment intents + webhooks
/api/v1/home/              CMS homepage configuration (public)
/api/v1/admin/…             admin-only endpoints (Supabase JWT + roles)
```

Consistent envelopes:
- Success: `{ "success": true, "data": …, "message": "…" }`
- Paginated: `data` + `pagination {page, page_size, total, total_pages}`
- Error: `{ "success": false, "message": "…", "errors": {field: [msg]} }`

## 7. Caching & background work

- Redis is used for catalogue/category/banner caching and DRF throttling.
- Cached keys are versioned by object (e.g. `product:<id>:v<updated_at>`).
- Admin writes invalidate the relevant keys so pricing/stock is never served
  stale to checkout.
- Celery handles: order confirmation side effects, inventory transactions,
  notification dispatch, analytics aggregation snapshots.

## 8. Image pipeline (Cloudinary)

- All images (products, categories, banners, posters, avatars) are uploaded to
  Cloudinary through the backend.
- The database stores `public_id`, `secure_url`, `format`, `width`, `height`
  and a `sort_order` — never the binary.
- Images are served through Cloudinary transformation URLs (width/quality
  tuned by usage: card, detail, banner, thumbnail).
- Deleting a product/image/category removes the Cloudinary asset too.
- Binary data is never stored in PostgreSQL.

## 9. Payments (provider-independent)

`apps/payments/services` defines a `PaymentProvider` protocol with
implementations selected by `PAYMENT_PROVIDER`:

```
MOCK   → deterministic local flow for development/tests
PHONEPE→ PhonePe PG (merchant id, salt key − backend only)
RAZORPAY / STRIPE → drop-in adapters
```

Flow: client requests `POST /api/v1/payments/initiate/{order}` → backend
creates `Payment` and returns provider payload → client redirects/shares
checkout → provider calls the **webhook** → backend verifies signature and
amount → order status flips to PAID (idempotent, transactional). All
credentials stay server-side.

## 10. Deployment targets

| Surface   | Host                          | Notes                                  |
|-----------|-------------------------------|----------------------------------------|
| Backend   | Render (Web Service + Redis)  | Gunicorn, `render.yaml`                |
| Database  | Supabase PostgreSQL           | `sslmode=require`                      |
| Admin Auth| Supabase Auth                 | JWT verified in Django                 |
| Customer  | Firebase Auth                 | ID tokens verified in Django           |
| Images    | Cloudinary                    | transformations, deletion              |
| Web       | Vercel / Netlify / Render     | static SPA                             |
| Admin     | Vercel / Netlify / Render     | static SPA                             |
| Mobile    | Play Store / App Store        | Flutter release builds                 |

See `docs/deployment.md` for step-by-step provisioning.

## 11. Security posture

- `DEBUG=False`, hardened cookies/HSTS in production settings.
- No secrets in repositories; `.env.example` documents every variable.
- CSRF enabled for cookie/session flows; token auth for API.
- DRF throttling per endpoint group (anon/user/login/checkout).
- Input validated by serializers; ORM only (no raw SQL).
- Admin and customer planes are fully separated (no shared token types).
- Logging records auth failures, order/payment/inventory/admin events and
  never logs passwords, tokens or payment secrets.