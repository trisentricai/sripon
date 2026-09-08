# Deployment Guide

## Render Configuration

### Customer Frontend (web)
- Build: `pnpm --filter @ecommerce/web build`
- Start: `pnpm --filter @ecommerce/web preview`
- Root: `apps/web`

### Admin Dashboard (admin)
- Build: `pnpm --filter @ecommerce/admin build`
- Root: `apps/admin`

### API (api)
- Build: `pnpm --filter @ecommerce/api build`
- Start: `pnpm --filter @ecommerce/api start`
- Root: `apps/api`

### Environment Variables
- Copy `.env.example` to `.env`
- Set production values for all secrets
- Never commit `.env`

### Database Migrations
- `npx prisma migrate deploy`
- Use `DATABASE_URL` from Supabase

### Redis
- Set `REDIS_URL` in production
- Use for caching and rate limiting

### Cloudinary
- Set `CLOUDINARY_CLOUD_NAME`, `API_KEY`, `API_SECRET`

### PhonePe Production
- Change `PHONEPE_ENVIRONMENT` to `PRODUCTION`
- Change `PHONEPE_BASE_URL` to production endpoint
- Verify webhook endpoints with PhonePe
