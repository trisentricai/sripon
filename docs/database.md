# SriPon Database Design

PostgreSQL is provided by Supabase and reached via `DATABASE_URL`
(`postgresql://...?...&sslmode=require`). Django owns the schema through
migrations; SQLite falls back for zero-config local development.

Guideline: monetary values use `DecimalField`, identifiers are big-ints with
UUIDs where client-visible or cross-system (orders, payments); every table has
`created_at`/`updated_at` and sensible indexes. Images reference Cloudinary
metadata, never binary data.

## 1. Entity map

```
UserProfile ──< Address
     │
     ├──< Cart ──< CartItem ── Product
     ├──< Wishlist ──< WishlistItem ── Product
     └──< Order ──< OrderItem ── Product (snapshot)
              ├──< OrderStatusHistory
              ├──< Payment
              ├──< CouponUsage
              └── Address (fk copy)

AdminUser                  (Supabase user mapping + role)
Category ──< Category      (self-referencing parent)
Category ──< Product ──< ProductImage
Product ──< Inventory ──< InventoryTransaction
Banner ──< BannerImage
Coupon ──< CouponUsage
HomepageSection, SiteSetting, Notification — standalone
```

## 2. Model definitions

### apps.users — `UserProfile`
| Field | Type | Notes |
|---|---|---|
| id | BigAuto | pk |
| firebase_uid | CharField(128) | **unique**, indexed |
| name | CharField(255) | |
| email | EmailField | indexed |
| phone | CharField(20, blank) | indexed |
| profile_image | JSONField | Cloudinary meta `{public_id, secure_url, …}` |
| active | Boolean | default True |
| created_at / updated_at | DateTime | auto |

### apps.users — `AdminUser`
| Field | Type | Notes |
|---|---|---|
| id | BigAuto | pk |
| supabase_uid | CharField(128) | **unique** |
| email | EmailField | unique |
| name | CharField(255) | |
| role | CharField(20) | choices: SUPER_ADMIN, ADMIN, MANAGER, ORDER_MANAGER, PRODUCT_MANAGER, CONTENT_MANAGER, ANALYST |
| active | Boolean | default True |
| last_login | DateTime null | |

### apps.users — `Address`
| Field | Type | Notes |
|---|---|---|
| customer | FK UserProfile | on_delete CASCADE |
| full_name, phone | CharField | |
| address_line_1, address_line_2 | CharField | |
| city, district, state | CharField | |
| pincode | CharField(10) | indexed |
| landmark | CharField blank | |
| is_default | Boolean | default False |
| created_at / updated_at | DateTime | |

### apps.categories — `Category`
| Field | Type | Notes |
|---|---|---|
| name | CharField(255) | |
| slug | SlugField(unique) | indexed |
| description | TextField blank | |
| image | JSONField | Cloudinary meta |
| banner | JSONField | Cloudinary meta |
| parent | FK self null | blank=True, null=True, related_name="children" |
| sort_order | PositiveInt default 0 | |
| active | Boolean default True | |
| created_at / updated_at | DateTime | |
| constraints | unique(parent, name) | |

### apps.products — `Product`
| Field | Type | Notes |
|---|---|---|
| category | FK Category | SET_NULL null=True, related_name="products" |
| sku | CharField(64, unique) | indexed |
| product_code | CharField(64, blank) | indexed |
| name | CharField(255) | indexed (gin trigram optional) |
| slug | SlugField(unique) | indexed |
| brand | CharField(128, blank) | |
| description | TextField | |
| short_description | CharField(500, blank) | |
| mrp | Decimal(12,2) | >= price |
| price | Decimal(12,2) | selling price |
| discount_price | Decimal(12,2) null | effective price when active |
| tax | Decimal(5,2) default 0 | percent |
| stock_quantity | PositiveInt | mirrored by Inventory |
| reserved_quantity | PositiveInt default 0 | |
| minimum_order_quantity | PositiveInt default 1 | |
| maximum_order_quantity | PositiveInt null | |
| weight | Decimal(10,3) null | |
| unit | CharField(20) default "box" | |
| specifications | JSONField default dict | |
| highlights | JSONField default list | |
| is_featured / is_best_seller / is_new / is_active | Boolean | each indexed |
| created_at / updated_at | DateTime | indexed |
| meta | JSONField | SEO title/description (Phase 11) |

Computed helpers: `available_quantity = stock_quantity - reserved_quantity`,
`effective_price` returns `discount_price` when set.

### apps.products — `ProductImage`
| Field | Type | Notes |
|---|---|---|
| product | FK Product CASCADE | |
| public_id | CharField | Cloudinary |
| secure_url | URLField | |
| alt_text | CharField blank | |
| width / height | PositiveInt null | |
| is_primary | Boolean default False | |
| sort_order | PositiveInt default 0 | |
| constraints | unique(product, sort_order) | |

### apps.products — `Inventory`
| Field | Type | Notes |
|---|---|---|
| product | OneToOne Product | |
| stock_quantity | PositiveInt default 0 | |
| reserved_quantity | PositiveInt default 0 | |
| low_stock_threshold | PositiveInt default 5 | |
| updated_at | DateTime | |

### apps.products — `InventoryTransaction`
| Field | Type | Notes |
|---|---|---|
| product | FK Product | |
| quantity_change | Int | +/- |
| reason | CharField(30) | choices: SALE, SALE_CANCELLED, PURCHASE, ADJUSTMENT, RETURN, RESERVATION, RELEASE |
| reference | CharField(100, blank) | order/item ref |
| admin_user | FK AdminUser null | who adjusted |
| created_at | DateTime indexed | |

### apps.cart — `Cart`
| Field | Type | Notes |
|---|---|---|
| customer | OneToOne UserProfile | |
| created_at / updated_at | DateTime | |

### apps.cart — `CartItem`
| Field | Type | Notes |
|---|---|---|
| cart | FK Cart CASCADE | |
| product | FK Product CASCADE | |
| quantity | PositiveInt | validates min/max + stock |
| added_at | DateTime | |
| constraints | unique(cart, product) | |

### apps.cart — `Wishlist`
| Field | Type | Notes |
|---|---|---|
| customer | OneToOne UserProfile | |
| created_at / updated_at | DateTime | |

### apps.cart — `WishlistItem`
| Field | Type | Notes |
|---|---|---|
| wishlist | FK Wishlist CASCADE | |
| product | FK Product CASCADE | |
| added_at | DateTime | |
| constraints | unique(wishlist, product) | |
| ordering | -added_at | |

### apps.orders — `Order`
| Field | Type | Notes |
|---|---|---|
| order_number | CharField(24, unique) | human friendly e.g. SP-2026-000123 |
| customer | FK UserProfile | |
| address_snapshot | JSONField | full shipping address copy |
| subtotal | Decimal(12,2) | |
| discount | Decimal(12,2) default 0 | |
| tax | Decimal(12,2) default 0 | |
| delivery_fee | Decimal(12,2) default 0 | |
| coupon_code | CharField(64, blank) | snapshot |
| total | Decimal(12,2) | subtotal - discount + tax + delivery_fee |
| payment_status | CharField(20) | PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| order_status | CharField(30) | PENDING, CONFIRMED, PROCESSING, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RETURN_REQUESTED, RETURNED |
| notes | TextField blank | |
| admin_notes | TextField blank | internal |
| placed_at | DateTime indexed | |
| updated_at | DateTime | |
| indexes | (customer, placed_at), (order_status, payment_status) | |

Statuses stored as choices constants in `apps/orders/constants.py`.

### apps.orders — `OrderItem` (price snapshot)
| Field | Type | Notes |
|---|---|---|
| order | FK Order CASCADE | |
| product | FK Product SET_NULL null | |
| name / sku | CharField | snapshot |
| unit_price | Decimal(12,2) | price at order time |
| discount | Decimal(12,2) default 0 | per item |
| tax | Decimal(5,2) default 0 | percent at order time |
| quantity | PositiveInt | |
| final_price | Decimal(12,2) | per-unit after discount, excl. tax |
| line_total | Decimal(12,2) | final_price * quantity |

### apps.orders — `OrderStatusHistory`
| Field | Type | Notes |
|---|---|---|
| order | FK Order CASCADE | |
| from_status / to_status | CharField | nullable unless same |
| note | CharField(255, blank) | |
| actor_type | CharField | customer / admin / system |
| actor | CharField(128, blank) | admin email or "customer" |
| created_at | DateTime | |

### apps.payments — `Payment`
| Field | Type | Notes |
|---|---|---|
| payment_id | UUID | pk (client-visible) |
| order | FK Order CASCADE… related_name="payments" | |
| provider | CharField(30) | e.g. MOCK, PHONEPE, RAZORPAY, STRIPE |
| amount | Decimal(12,2) | backend-calculated |
| currency | CharField(8) default INR | |
| status | CharField(20) | PENDING, INITIATED, SUCCESS, FAILED, REFUNDED, PARTIALLY_REFUNDED |
| provider_ref | CharField(128, blank) | gateway transaction id |
| initiation_payload | JSONField | provider-specific (no secrets) |
| webhook_payload | JSONField | verified copy |
| checksum | CharField(512, blank) | fingerprint for verify |
| completed_at | DateTime null | |
| created_at / updated_at | DateTime | |
| constraints | unique(order, status) where status=SUCCESS (partial index) | idempotency |

### apps.coupons — `Coupon`
| Field | Type | Notes |
|---|---|---|
| code | CharField(32, unique) | uppercased |
| discount_type | CharField | PERCENTAGE / FIXED_AMOUNT |
| discount_value | Decimal(12,2) | percent amount or fixed value |
| minimum_order_value | Decimal(12,2) default 0 | |
| maximum_discount | Decimal(12,2) null | cap for percentage |
| start_date / expiry_date | DateTime | |
| usage_limit | PositiveInt null | total redemptions |
| per_customer_limit | PositiveInt default 1 | |
| active | Boolean default True | |
| created_at / updated_at | DateTime | |

### apps.coupons — `CouponUsage`
| Field | Type | Notes |
|---|---|---|
| coupon | FK Coupon | |
| customer | FK UserProfile | |
| order | FK Order null | |
| applied_discount | Decimal(12,2) | |
| created_at | DateTime | |
| constraints | unique(coupon, customer, order) | |

### apps.banners — `Banner`
| Field | Type | Notes |
|---|---|---|
| title | CharField(255, blank) | |
| subtitle | CharField(512, blank) | |
| placement | CharField(30) | HOME_HERO, HOME_SECONDARY, HOME_MIDDLE, HOME_BOTTOM, CATEGORY_TOP, PRODUCT_PROMOTION, APP_HOME |
| cta_text | CharField(40, blank) | |
| cta_action | CharField(30) | PRODUCT / CATEGORY / URL / NONE |
| link_product | FK Product null | for PRODUCT action |
| link_category | FK Category null | for CATEGORY action |
| custom_url | URLField blank | for URL action |
| overlay_text_enabled | Boolean default True | |
| text_alignment | CharField(10) default "left" | left / center / right |
| button_visible | Boolean default True | |
| display_priority | PositiveInt default 0 | ascending = earlier |
| start_date / end_date | DateTime | active window |
| active | Boolean default True | |
| created_at / updated_at | DateTime | |
| manager | FK AdminUser null | last editor |

### apps.banners — `BannerImage`
| Field | Type | Notes |
|---|---|---|
| banner | FK Banner CASCADE | |
| variant | CharField(20) | DESKTOP / MOBILE / IMAGE (legacy generic) |
| public_id | CharField | |
| secure_url | URLField | |
| width / height / alt | … | |

### apps.settings — `SiteSetting`
| Field | Type | Notes |
|---|---|---|
| key | CharField(100, unique) | e.g. store_name, delivery_fee, min_order_value, free_delivery_threshold, terms, refund_policy, safety_notice, maintenance_mode |
| value | JSONField | |
| group | CharField(40, index) | GENERAL, SHOPPING, LEGAL, SOCIAL, PAYMENT |
| updated_at | DateTime | |

### apps.settings — `HomepageSection`
| Field | Type | Notes |
|---|---|---|
| section_type | CharField(30) | HERO, CATEGORIES, FEATURED, BEST_SELLERS, NEW_ARRIVALS, OFFERS, PROMOTIONAL_POSTER, CUSTOM_COLLECTION |
| title / subtitle | CharField | |
| enabled | Boolean default True | |
| display_order | PositiveInt default 0 | |
| content_type | CharField(20) | none / products / categories / banner |
| linked_banner | FK Banner null | |
| linked_categories | M2M Category blank | |
| linked_products | M2M Product blank | |
| max_items | PositiveInt default 12 | |
| updated_at | DateTime | |

### apps.notifications — `Notification`
| Field | Type | Notes |
|---|---|---|
| customer | FK UserProfile null | null = broadcast |
| title / body | CharField | |
| type | CharField(30) | ORDER, PAYMENT, PROMO, SYSTEM |
| payload | JSONField default dict | |
| read_at | DateTime null | |
| created_at | DateTime | indexed |

### apps.notifications — `NotificationEventLog`
| Field | Type | Notes |
|---|---|---|
| event | CharField(40) | ORDER_CONFIRMED, ORDER_STATUS_CHANGED, PAYMENT_CONFIRMED, PROMO |
| recipient_type | CharField | CUSTOMER / ADMIN / BROADCAST |
| channel | CharField | EMAIL / FCM / IN_APP |
| status | CharField | PENDING, SENT, FAILED |
| error | TextField blank | |
| created_at | DateTime | |

## 3. Integrity rules

- Order creation, inventory reservation, payment confirmation and coupon
  redemption each run inside `transaction.atomic()` with
  `select_for_update()` on the involved rows.
- Money is always `Decimal`; the effective price is recomputed server-side.
- Overselling is prevented by an atomic check/update
  (`F()` guard: `stock_quantity - reserved_quantity >= qty`).
- Payment success is idempotent: only one SUCCESS payment per order.
- Coupon use is bounded by total + per-customer limits under row locks.

## 4. Migrations

All schema changes are generated with
`python manage.py makemigrations` and applied with
`python manage.py migrate`. The initial migration set ships with the codebase
from Phase 2/3 builds.