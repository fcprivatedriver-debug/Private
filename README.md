# Movio

Professional marketplace for private drivers — customers publish trip requests, drivers send offers, customers choose the best proposal.

**Brand:** Movio · **Default currency:** EUR · **Locales:** Portuguese, English · **Database:** PostgreSQL (Neon)

> See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [docs/DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md).

## Quick start (local PostgreSQL)

```bash
cp .env.example .env
# Set DATABASE_URL and DIRECT_URL to your Postgres (Neon or local)
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000/pt](http://localhost:3000/pt) or [http://localhost:3000/en](http://localhost:3000/en).

### Demo accounts (password: `movio123`)

| Email | Role |
|-------|------|
| `cliente@movio.app` | Customer |
| `motorista@movio.app` | Driver (active) |
| `admin@movio.app` | Admin |

## Deploy to Vercel

1. Create a Neon Postgres project and copy **pooled** + **direct** URLs.
2. Set Vercel env vars (see below).
3. Deploy from `main` — `npm run build` applies migrations automatically.
4. Run the seed once (see [docs/DEPLOY_VERCEL.md](./docs/DEPLOY_VERCEL.md)).

### Required Vercel environment variables (first deploy)

| Name | Value |
|------|--------|
| `DATABASE_URL` | Neon **pooled** connection string (`…-pooler…?sslmode=require`) |
| `DIRECT_URL` | Neon **direct** connection string (no `-pooler`, `?sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `PAYMENTS_ENABLED` | `false` |
| `PLATFORM_FEE_PERCENT` | `15` |
| `NEXT_PUBLIC_APP_NAME` | `Movio` |

Optional later: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, Google OAuth, Stripe, `CRON_SECRET`, `DEMO_MODE`.

## Product defaults

- Commission: **15%** (configurable)
- Contacts visible **only after payment confirmed**
- Maps: **Google Maps** (Places + Geocoding)
- Repo/package name: **movio**
