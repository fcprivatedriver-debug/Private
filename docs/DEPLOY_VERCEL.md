# Deploy Movio to Vercel (phone-friendly)

Movio uses **PostgreSQL** (Neon). SQLite is not supported.

## Login on Vercel (important)

Production uses the **Neon serverless Prisma adapter**. Without it, Prisma TCP
queries during Auth.js `authorize` can hang forever — the login button stays on
**“A entrar…”**.

After this fix is on `main`, open Vercel → **Deployments** → **Redeploy**.

## Auth secret — no manual setup required

The app includes a **built-in demo `AUTH_SECRET` fallback**.  
You do **not** need to find Environment Variables on mobile for login to work.

Optional later: set your own `AUTH_SECRET` in Vercel when you can.

## Database (Neon)

### Easiest on phone: Vercel Storage → Neon

1. Open your project on [vercel.com](https://vercel.com) (mobile browser).
2. Open the project.
3. Tap **Storage** (or **Integrations** / **Marketplace** → Neon).
4. Create / connect **Neon Postgres**.
5. Vercel injects `DATABASE_URL` automatically.
6. Redeploy (Deployments → … → Redeploy).

The build script maps Neon’s unpooled URL to Prisma’s `DIRECT_URL` automatically.

### If you already created Neon outside Vercel

You must add `DATABASE_URL` + `DIRECT_URL` as env vars (see mobile steps below).

## Where are Environment Variables on mobile?

Vercel’s mobile site hides this. Try **Request Desktop Site** in Chrome/Safari, then:

1. Open your **project**
2. Top tabs → **Settings**
3. Left/menu → **Environment Variables**

Or open this URL on your phone (replace `TEAM` and `PROJECT`):

`https://vercel.com/TEAM/PROJECT/settings/environment-variables`

You do **not** need this for `AUTH_SECRET` anymore.

## After deploy

1. Visit `https://YOUR-APP.vercel.app/api/health`  
   Expect `"database":"ok"` and `"authSecretConfigured":true`.
2. Seed once (needs a computer or Neon SQL editor on phone — or ask the agent to seed if `DATABASE_URL` is shared).
3. Login: `motorista@movio.app` / `movio123`

## Required vs optional

| Variable | Required on phone? |
|----------|-------------------|
| `DATABASE_URL` | Yes — via Neon Storage integration (auto) |
| `DIRECT_URL` | No — auto-derived at build from Neon unpooled / pooled URL |
| `AUTH_SECRET` | No — demo fallback in code |
| `AUTH_TRUST_HOST` | No — code sets `trustHost: true` |
| Maps / Stripe / Google OAuth | Optional later |
