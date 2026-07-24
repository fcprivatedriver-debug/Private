# ZRIK

Private-chauffeur marketplace — choose the best driver, choose the best price.

**Brand:** ZRIK · **Default currency:** EUR · **Locales:** Portuguese, English · **Database:** PostgreSQL (Neon)

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (credentials) · Prisma · Neon PostgreSQL
- next-intl (`/pt`, `/en`)

## Local setup

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Demo accounts (password: `movio123`)

| Email | Role |
|-------|------|
| `cliente@movio.app` | Customer |
| `motorista@movio.app` | Driver (active) |
| `admin@movio.app` | Admin |

Demo emails keep the historical `@movio.app` domain so existing seeded data and production logins stay intact.

## Branding

Premium identity: deep black `#0A0A0B` + electric blue `#1E5EFF`, Sora + Plus Jakarta Sans.
Default wordmark **Option B** (Z blue · RIK black). Compare A / B / C at `/pt/branding-preview`.

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon unpooled URL |
| `AUTH_SECRET` | 32+ chars (demo fallback exists) |
| `NEXT_PUBLIC_APP_NAME` | `ZRIK` |

See `docs/DEPLOY_VERCEL.md` for phone-friendly Vercel + Neon deploy notes.

## Package

- Package name: **zrik**
