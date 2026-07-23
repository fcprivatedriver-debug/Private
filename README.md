# Movio

Professional marketplace for private drivers — customers publish trip requests, drivers send offers, customers choose the best proposal.

**Brand:** Movio · **Default currency:** EUR · **Locales:** Portuguese, English

> Phase 0 — Foundation. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Quick start

```bash
cp .env.example .env
npm install
npx prisma migrate dev
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

## Product defaults

- Commission: **15%** (configurable)
- Contacts visible **only after payment confirmed**
- Maps: **Google Maps** (Places + Geocoding)
- Repo/package name: **movio**
