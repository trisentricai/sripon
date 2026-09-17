# SriPon REST API

Base URL: `<API_BASE_URL>/api/v1` (e.g. `https://api.sripon.in/api/v1`).
Interactive documentation: `GET /api/docs/` (Swagger) and `GET /api/schema/`
(OpenAPI 3 JSON).

## 1. Conventions

- JSON only. Content-Type `application/json`.
- Authentication: `Authorization: Bearer <token>` where the token is a
  **Firebase ID token** (customer) or **Supabase JWT** (admin).
- Customer endpoints require a valid Firebase token; admin endpoints require a
  Supabase JWT plus a role stored in `AdminUser`.
- Envelopes:
  - `{ "success": true, "data": ..., "message": "..." }`
  - Paginated list: `data` + `pagination {page, page_size, total, total_pages}`
  - Error: `{ "success": false, "message": "...", "errors": {field: [...]} }`
- Query parameters are snake_case; body fields snake_case.

## 2. Auth (customer, Firebase)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/firebase/verify/` | – | Exchange a Firebase ID token → creates/syncs UserProfile, returns profile + auth payload |
| POST | `/auth/google/` | – | Same flow for Google ID token |
| GET | `/auth/me/` | customer | Current customer profile |
| PATCH | `/auth/me/` | customer | Update profile |
| POST | `/auth/me/device-token/` | customer | Register FCM device token |
| GET | `/auth/addresses/` | customer | List addresses |
| POST | `/auth/addresses/` | customer | Create address |
| PATCH | `/auth/addresses/{id}/` | customer | Update address |
| DELETE | `/auth/addresses/{id}/` | customer | Delete address |
| POST | `/auth/addresses/{id}/default/` | customer | Set default address |

The Google flow reuses `/auth/firebase/verify/` semantics: Firebase Auth mints
the ID token for Google sign-in, so `POST /auth/google/` is an alias.

### Admin auth (Supabase)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/admin/verify/` | admin | Verify the Supabase JWT and return the admin profile + role |

Admins sign in through Supabase; the dashboard sends the resulting JWT as a
bearer token. Django verifies the signature (HS256, `SUPABASE_JWT_SECRET`) and
maps the token subject to an `AdminUser`. Accounts are auto-provisioned only
when the JWT carries a SriPon role claim (`app_metadata.sripon_role` or
`role`) matching the role list; otherwise access is denied.

## 3. Products & categories (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/products/` | List with search, filters, sort (see below) |
| GET | `/products/{id}/` | Detail |
| GET | `/products/slug/{slug}/` | Detail by slug (SEO-friendly) |
| GET | `/products/best-sellers/` | Best sellers collection |
| GET | `/products/new-arrivals/` | New arrivals collection |
| GET | `/products/suggestions/?q=` | Lightweight type-ahead suggestions |
| GET | `/categories/` | Category list (tree via `?tree=true`) |
| GET | `/categories/{id}/` | Detail |
| GET | `/categories/slug/{slug}/` | Detail + nested products |
| GET | `/categories/{id}/products/` | Products inside category tree |

### Search
`q` matches name, SKU, product code (case-insensitive). Additional filter
params: `category`, `category__in`, `min_price`, `max_price`,
`availability` (`in_stock` / `out_of_stock`), `discounted`, `featured`,
`best_seller`, `new`, `brand`, `unit`.

### Sorting
`ordering` accepts `price`, `-price`, `newest`, `popularity`, `discount`,
`name`. Default `-created_at`.

### Pagination
`page`, `page_size` (max 100). Response includes the pagination envelope.

## 4. Banners & posters (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/banners/?placement=HOME_HERO` | Only active, in date-window, ordered by priority |
| GET | `/banners/{id}/` | Detail with desktop/mobile images |

`placement` values: `HOME_HERO`, `HOME_SECONDARY`, `HOME_MIDDLE`,
`HOME_BOTTOM`, `CATEGORY_TOP`, `PRODUCT_PROMOTION`, `APP_HOME`.
The backend returns only live banners (status `active`, now within
start/end). Mobile clients request `?placement=APP_HOME`.

## 5. Homepage CMS (public)

| Method | Path | Purpose |
|---|---|---|
| GET | `/home/` | Ordered enabled sections; each carries product/category/banner payloads |

The website and app render this directly - no hard-coded promotions.

## 6. Cart (customer)

| Method | Path | Purpose |
|---|---|---|
| GET | `/cart/` | Cart with server-recalculated totals |
| POST | `/cart/items/` | Add item `{product_id, quantity}` |
| PATCH | `/cart/items/{id}/` | Update quantity |
| DELETE | `/cart/items/{id}/` | Remove item |
| POST | `/cart/clear/` | Clear cart |
| POST | `/cart/merge/` | Merge guest items after login `{items:[{product_id,quantity}]}` |

Prices are never trusted from the client - totals are recomputed from current
products.

## 7. Wishlist (customer)

| Method | Path | Purpose |
|---|---|---|
| GET | `/wishlist/` | List |
| POST | `/wishlist/items/` | `{product_id}` |
| DELETE | `/wishlist/items/{product_id}/` | Remove |
| POST | `/wishlist/items/{product_id}/move-to-cart/` | Move to cart |

## 8. Checkout & orders (customer)

| Method | Path | Purpose |
|---|---|---|
| POST | `/coupons/validate/` | `{code, order_value}` → valid/discounted amount |
| POST | `/orders/` | Place order `{address_id, coupon_code?, items?}` |
| GET | `/orders/` | My orders (paginated) |
| GET | `/orders/{id}/` | Order detail + timeline |
| POST | `/orders/{id}/cancel/` | Request cancellation (while PENDING/CONFIRMED) |

`POST /orders/` behavior (backend authoritative):
1. Reads active cart (or provided items), validates stock, min/max quantities.
2. Fetches current prices, taxes, delivery fee, coupon (valid + locked).
3. Computes subtotal → discount → tax → delivery_fee → total.
4. Reserves inventory and creates `Order`, `OrderItem`s, status history inside
   a transaction.

## 9. Payments (customer + webhook)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/payments/initiate/{order_id}/` | customer | Create payment, return provider payload |
| GET | `/payments/{payment_id}/` | customer | Payment status |
| POST | `/payments/webhook/{provider}/` | – | Gateway callback; verified server-side |
| POST | `/payments/mock/success/` | customer | Dev-only mock confirmation |

The webhook handler verifies signature/checksum and amount, marks the payment
SUCCESS (idempotent) and flips the order to PAID, all in one transaction.

## 10. Admin endpoints (Supabase JWT + roles)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/admin/dashboard/` | all | Stats: revenue (today/total), orders, customers, low stock, top products |
| GET | `/admin/analytics/` | ANALYST+ | Revenue/orders charts with `?from=&to=&group_by=day` |
| GET/POST | `/admin/products/` | PRODUCT_MGR+ | List/create |
| GET/PATCH/DELETE | `/admin/products/{id}/` | PRODUCT_MGR+ | Detail/update/deactivate |
| POST | `/admin/products/{id}/images/` | PRODUCT_MGR+ | Upload image(s) → Cloudinary (`image` or `images[]`) |
| GET | `/admin/products/{id}/images/` | PRODUCT_MGR+ | List a product's images |
| DELETE | `/admin/products/{id}/images/{image_id}/` | PRODUCT_MGR+ | Remove image (+ Cloudinary) |
| POST | `/admin/products/{id}/images/reorder/` | PRODUCT_MGR+ | `{items: [{id, sort_order}]}` |
| POST | `/admin/products/{id}/images/{image_id}/primary/` | PRODUCT_MGR+ | Make image the primary |
| GET/POST | `/admin/categories/` | PRODUCT_MGR+ | Categories CRUD |
| PATCH/DELETE | `/admin/categories/{id}/` | PRODUCT_MGR+ | Update/delete |
| GET/PATCH | `/admin/inventory/` | PRODUCT_MGR+ | Stock levels, low stock |
| POST | `/admin/inventory/{product_id}/adjust/` | PRODUCT_MGR+ | `{quantity, reason, note}` |
| GET | `/admin/inventory/transactions/` | PRODUCT_MGR+ | History |
| GET/PATCH | `/admin/orders/` | ORDER_MGR+ | List (search, status, date) / bulk |
| GET | `/admin/orders/{id}/` | ORDER_MGR+ | Detail incl. customer + items |
| PATCH | `/admin/orders/{id}/status/` | ORDER_MGR+ | `{status, note}` → history entry |
| PATCH | `/admin/orders/{id}/payment-status/` | ORDER_MGR+ | Payment status change |
| GET | `/admin/orders/{id}/invoice/` | ORDER_MGR+ | Printable invoice |
| GET | `/admin/customers/` | ORDER_MGR+ | Customer directory (search) |
| GET | `/admin/customers/{id}/` | ORDER_MGR+ | Customer + orders |
| GET/POST | `/admin/coupons/` | MANAGER+ | Coupon CRUD |
| PATCH/DELETE | `/admin/coupons/{id}/` | MANAGER+ | Update/delete |
| GET/POST | `/admin/banners/` | CONTENT_MGR+ | Banner CRUD incl. images, schedule |
| PATCH/DELETE | `/admin/banners/{id}/` | CONTENT_MGR+ | Update/toggle/delete |
| POST | `/admin/banners/{id}/duplicate/` | CONTENT_MGR+ | Duplicate |
| GET/PATCH | `/admin/home/` | CONTENT_MGR+ | Homepage sections reorder/enable |
| GET/PATCH | `/admin/settings/` | MANAGER+ | Site settings, delivery, tax, legal |
| GET/POST | `/admin/admin-users/` | SUPER_ADMIN | Adminuser management |
| PATCH/DELETE | `/admin/admin-users/{id}/` | SUPER_ADMIN | Role edits |
| POST | `/admin/notifications/broadcast/` | MANAGER+ | Compose promo notification |

## 11. Auth for other clients & status codes

- 200/201 success · 400 validation · 401 unauthenticated · 403 forbidden
  (role) · 404 not found · 429 throttled · 5xx server (normalised envelope).

## 12. Error examples

```json
{ "success": false, "message": "Only 2 units are available.", "errors": { "quantity": ["Only 2 units are available."] } }
```

```json
{ "success": false, "message": "Coupon is expired.", "errors": {} }
```