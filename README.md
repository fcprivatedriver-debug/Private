# ZRIK

Private-chauffeur marketplace — customers request trips, drivers send offers, bookings are confirmed after payment.

**Brand:** ZRIK · **Currency:** EUR · **Locales:** Portuguese, English · **Database:** PostgreSQL (Neon)

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (credentials) · Prisma · Neon PostgreSQL
- next-intl (`/pt`, `/en`)

## App entry

`/` redirects by authentication:

| State | Destination |
|-------|-------------|
| Anonymous | `/login` |
| Customer | `/pedidos` |
| Driver | `/painel` |
| Admin | `/admin` |

## Local setup

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed   # optional local fixtures
npm run dev
```

### Optional seed accounts (password: `movio123`)

For local development only — never shown in the product UI.

| Email | Role |
|-------|------|
| `cliente@movio.app` | Customer |
| `motorista@movio.app` | Driver |
| `admin@movio.app` | Admin |

## Environment

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon direct URL (migrations) |
| `AUTH_SECRET` | Auth.js secret (required in production) |
| `NEXTAUTH_URL` | Public app URL (email links) |
| `RESEND_API_KEY` | Optional real email delivery |
| `PAYMENTS_ENABLED` | `true` when Stripe is configured |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps / places |
