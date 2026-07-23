# Deploy Movio to Vercel (Neon PostgreSQL)

Movio uses **PostgreSQL** (Neon recommended). SQLite is no longer supported.

## 1. Create a Neon database

1. Open [https://console.neon.tech](https://console.neon.tech) and create a project (e.g. `movio`).
2. Open **Connect** and copy **both** connection strings:
   - **Pooled** (hostname contains `-pooler`) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL`
3. Keep `?sslmode=require` on both.

Example shapes:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require"
```

If you use the **Vercel Neon integration**, it injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct).  
In that case set `DIRECT_URL` = the value of `DATABASE_URL_UNPOOLED`.

## 2. Vercel project

1. Import `fcprivatedriver-debug/Private` (branch `main`).
2. Framework: **Next.js** (auto-detected).
3. Build command: `npm run build` (runs `prisma migrate deploy` then `next build`).
4. Add environment variables (Production + Preview).

## 3. Seed demo data (once after first deploy)

From your machine (with production env):

```bash
DATABASE_URL="…" DIRECT_URL="…" npx tsx prisma/seed.ts
```

Or use Vercel CLI:

```bash
vercel env pull .env.production.local
npx tsx prisma/seed.ts
```

Demo logins (password `movio123`): `cliente@movio.app`, `motorista@movio.app`, `admin@movio.app`.

## 4. Local PostgreSQL (optional)

```bash
createdb movio
cp .env.example .env
# set DATABASE_URL + DIRECT_URL to local Postgres
npx prisma migrate deploy
npm run db:seed
npm run dev
```
