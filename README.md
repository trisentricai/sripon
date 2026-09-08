# E-Commerce Platform

A production-grade, scalable e-commerce platform inspired by Amazon and Flipkart.

## Architecture

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

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query, Zustand
- **Backend**: Node.js, TypeScript, Fastify
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Auth + Google OAuth
- **Storage**: Cloudinary
- **Payments**: PhonePe
- **Cache**: Redis
- **Monorepo**: pnpm + Turborepo
- **Deployment**: Render

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project
- Redis
- Docker (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Run all apps in dev mode
pnpm dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm typecheck` | Run TypeScript checking |

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [API](docs/api.md)
- [Authentication](docs/authentication.md)
- [Payments](docs/payments.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)

## License

MIT
# sripon
