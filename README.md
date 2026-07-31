# ZELU

Private-chauffeur marketplace — choose the best driver, choose the best price.

**Brand:** ZELU · **Default currency:** EUR · **Locales:** Portuguese, English · **Database:** PostgreSQL (Neon)

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

Internal seed accounts (if used) are **never** shown in the public UI.

## Branding

Premium European mobility: ink `#111111` + petroleum blue.
Logo Option B (Z accent · ELU ink). Compare tones at `/pt/homepage-lab` (internal).

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon pooled URL |
| `DIRECT_URL` | Neon unpooled URL |
| `AUTH_SECRET` | 32+ chars (demo fallback exists) |
| `NEXT_PUBLIC_APP_NAME` | `ZELU` |

See `docs/DEPLOY_VERCEL.md` for phone-friendly Vercel + Neon deploy notes.

## Package

- Package name: **zelu**
