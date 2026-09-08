# E-Commerce Platform - Claude Instructions

This project is a production-grade e-commerce platform built with a monorepo architecture. Follow the phase-based implementation plan strictly.

## Development Phases

### Phase 1: Foundation
- Initialize monorepo with pnpm and Turborepo
- Set up React/Vite for customer web app
- Set up React/Vite for admin dashboard
- Create Node.js backend API
- Establish shared packages
- Configure TypeScript, ESLint, Prettier
- Verify all apps run

### Phase 2: Database
- Set up Supabase PostgreSQL connection
- Configure ORM (Drizzle or Prisma)
- Design database schema with migrations
- Create seed data
- Set up indexes and constraints
- Create realistic development data

### Phase 3: Authentication
- Implement Supabase Auth
- Set up Google OAuth
- Configure session management
- Set up user profiles and roles
- Implement RBAC
- Create protected frontend routes
- Set up backend authorization middleware

### Phase 4: Product Catalog
- Set up categories and brands
- Implement products and variants
- Configure SKUs and inventory
- Set up product images with Cloudinary
- Build admin CRUD
- Then build customer catalog

### Phase 5: Search
- Implement PostgreSQL search
- Set up filters and sorting
- Add pagination
- Create search suggestions
- Set up search indexes

### Phase 6: Cart and Wishlist
- Implement cart with items
- Set up quantity changes and variants
- Create wishlist functionality
- Add stock and price validation

### Phase 7: Checkout
- Set up address management
- Configure delivery calculation
- Implement coupons
- Set up taxes and shipping
- Create order creation
- Implement checkout validation

### Phase 8: Payments (PhonePe)
- Set up payment creation
- Implement payment status checking
- Configure callback/webhook handling
- Implement server-side verification
- Set up idempotency
- Handle failed/cancelled payments
- Implement refunds

### Phase 9: Orders and Inventory
- Implement order state machine
- Set up inventory reservation
- Configure inventory deduction
- Implement cancellation
- Set up returns and refund workflow
- Create inventory movements

### Phase 10: Reviews
- Implement ratings and reviews
- Set up review images
- Configure verified purchase
- Add admin moderation

### Phase 11: Admin Analytics
- Build dashboard
- Implement revenue analytics
- Create order, customer, product analytics
- Set up payment analytics
- Configure conversion funnel
- Implement date filtering and charts

### Phase 12: Promotions
- Implement coupons
- Set up promotions
- Configure banners
- Create featured products
- Set up campaigns

### Phase 13: Notifications
- Implement order notifications
- Set up payment notifications
- Configure shipping notifications
- Create delivery notifications
- Add admin alerts
- Keep architecture extensible for multiple providers

### Phase 14: Security and Hardening
- Perform complete security review
- Check authentication and authorization
- Verify RBAC implementation
- Review CORS, rate limiting
- Check input validation
- Review secrets management
- Verify payment verification
- Review webhook security
- Check SQL queries
- Review file uploads
- Review admin endpoint security

### Phase 15: Testing
- Run complete test suite
- Fix TypeScript errors
- Fix ESLint errors
- Fix unit/integration test failures
- Fix build failures
- Test critical e2e flows

### Phase 16: Production
- Prepare production builds
- Configure Render deployment
- Set up environment variables
- Configure database migrations
- Set up Redis
- Configure Cloudinary
- Set up PhonePe production
- Configure CORS and domains
- Set up health checks
- Configure logging and monitoring

## Development Rules

### Phase Completion
- Do not skip phases
- Do not mark phase complete if it does not build
- Do not leave TypeScript errors
- Do not leave ESLint errors
- Do not use fake API implementations
- Do not hardcode secrets
- Do not expose server secrets to React
- Do not trust frontend calculations
- Do not trust frontend roles
- Do not trust frontend payment status
- Do not duplicate shared types
- Do not create giant components
- Do not put business logic in React components
- Do not directly access database from customer frontend
- Do not bypass backend authorization
- Use database transactions for critical operations
- Use idempotency for payment/order/refund operations
- Write tests for critical business logic
- Keep documentation updated
- Preserve existing working functionality

### Architectural Decisions
- When requirements are ambiguous:
  1. First inspect existing architecture
  2. Prefer established patterns already used
  3. Choose simplest production-safe implementation
  4. Document significant decisions

## Technology Stack

### Customer Frontend
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- Recharts

### Admin Frontend
- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

### Backend
- Node.js
- TypeScript
- Fastify
- REST API
- Zod validation
- Prisma ORM

### Database
- Supabase PostgreSQL
- Migrations

### Authentication
- Supabase Auth
- Google OAuth

### Storage
- Cloudinary

### Payments
- PhonePe Payment Gateway

### Cache
- Redis

### Deployment
- Render

## Project Structure

```
ecommerce-platform/
├── apps/
│   ├── web/          # Customer React application
│   ├── admin/        # Admin React dashboard
│   └── api/          # Node.js backend API
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── validation/   # Shared Zod validation schemas
│   ├── ui/           # Shared UI components (shadcn/ui)
│   ├── config/       # Shared configuration utilities
│   └── database/     # Database utilities and Prisma client
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## Environment Variables

### Public (Frontend)
- SUPABASE_URL
- SUPABASE_ANON_KEY
- API_URL
- WEB_URL
- ADMIN_URL

### Server-Only
- SUPABASE_SERVICE_ROLE_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- REDIS_URL
- REDIS_PASSWORD
- PHONEPE_MERCHANT_ID
- PHONEPE_SALT_KEY
- PHONEPE_SALT_INDEX
- PHONEPE_ENVIRONMENT
- PHONEPE_BASE_URL
- API_PORT
- NODE_ENV
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- ENABLE_ANALYTICS
- ENABLE_REDIS_CACHE

## API Design

Use consistent REST API format:

**Success Response:**
```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## Error Handling

Create typed errors:
- VALIDATION_ERROR
- AUTHENTICATION_ERROR
- AUTHORIZATION_ERROR
- NOT_FOUND
- CONFLICT
- OUT_OF_STOCK
- PAYMENT_FAILED
- PAYMENT_PENDING
- INVALID_COUPON
- RATE_LIMITED
- INTERNAL_ERROR

## Frontend Architecture

Do not put everything in App.tsx. Use feature-based architecture:

```
features/
  auth/
    components/
    hooks/
    api/
    types/
  products/
  categories/
  search/
  cart/
  wishlist/
  checkout/
  orders/
  reviews/
```

Use TanStack Query for server state, Zustand only for:
- UI state
- Selected preferences
- Temporary client state

## Database Transactions

Use PostgreSQL transactions for:
- Order creation
- Inventory reservation
- Payment confirmation
- Refund processing
- Coupon usage

Example transaction structure:
```
BEGIN

Verify payment
Update payment
Create/update order
Deduct/reserve inventory
Record inventory movement
Update coupon usage

COMMIT

If any step fails:
ROLLBACK
```

## Security

Never trust:
- Frontend price
- Frontend stock
- Frontend role
- Frontend discount
- Frontend payment status

Implement:
- RBAC
- Authentication middleware
- Authorization middleware
- Request validation
- Rate limiting
- CORS
- Secure HTTP headers
- Input sanitization
- SQL injection prevention (ORM/parameterized queries)
- Secure cookie/token handling
- Payment signature verification
- Webhook verification
- Audit logging

## Implementation Notes

### For ambiguous requirements:
1. First inspect existing architecture
2. Prefer established patterns already used
3. Choose simplest production-safe implementation
4. Document significant decisions

### Do not stop for confirmation after every small implementation decision. However:
- If a decision could materially change architecture, security model, payment flow, or database model, explain the issue and ask before making an irreversible change.

### When completing a phase, provide:
1. Completed - list implemented items
2. Files Changed - list important files
3. Database Changes - describe migrations/schema changes
4. API Changes - list new/modified endpoints
5. Tests - list tests executed
6. Verification - report TypeScript, Lint, Tests, Build status
7. Next Phase - state next phase

## Working Directory

<workingDirectory>D:/Projects/Ecommerce</workingDirectory>

## Command History

<commandHistory>

## Current Context

<context>
Phase: 1
Status: In Progress
Current files created: Root package.json, turbo.json, pnpm-workspace.yaml, .gitignore, apps/web/package.json, apps/admin/package.json, apps/api/package.json
</context>
