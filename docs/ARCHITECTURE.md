# Movio — Architecture (Phase 0 Foundation)

> Private-driver marketplace (GetTransfer-style).  
> **Brand:** Movio  
> **Phase in scope:** Phase 0 — Foundation only

---

## Approved product decisions

| Decision | Choice |
|----------|--------|
| Brand / project name | **Movio** (repo target: `movio`) |
| Default currency | **EUR** — multi-currency ready |
| Platform commission | **15%** default — rates configurable (global + overrides later) |
| Contact visibility | Phone/email **only after payment is successfully confirmed** (`Booking` paid / `Payment` CAPTURED) |
| Maps | **Google Maps** — Places Autocomplete + Geocoding |
| i18n | **Portuguese + English** from day one (`next-intl`) |
| Roles (MVP) | Single primary role per account: `CUSTOMER` \| `DRIVER` \| `ADMIN` |

---

## Phase 0 deliverables

1. Next.js 15 + TypeScript + Tailwind scaffold branded **Movio**
2. Prisma schema (multi-currency, commission settings, expanded driver profile)
3. Auth.js foundation (credentials + optional Google OAuth)
4. i18n routing (`/pt`, `/en`) with message catalogs
5. Google Maps client scaffolding (Places + Geocoding)
6. Marketing landing + auth pages (localized)
7. Demo seed (admin, customer, driver)
8. Contact-privacy helpers enforced in domain/API boundaries

**Out of scope for Phase 0:** full marketplace UX polish beyond existing core, Stripe live charges, email provider wiring, fleet accounts.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router + TypeScript |
| UI | Tailwind + custom components |
| DB | Prisma + SQLite (dev) / PostgreSQL (prod) |
| Auth | Auth.js (NextAuth v5) |
| Validation | Zod |
| i18n | `next-intl` (PT, EN) |
| Maps | Google Maps JS API (`@googlemaps/js-api-loader`) |
| Payments | Provider interface + `NullPaymentProvider` (Stripe Connect later) |

---

## Folder structure (target)

```
movio/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── messages/
│   ├── pt.json
│   └── en.json
├── public/brand/
├── src/
│   ├── app/
│   │   ├── [locale]/          # all user-facing routes
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   ├── (app)/         # authenticated areas
│   │   │   └── layout.tsx
│   │   └── api/               # locale-agnostic APIs
│   ├── components/
│   ├── domain/                # business rules
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── money.ts           # multi-currency helpers
│   │   ├── commission.ts      # configurable fee resolution
│   │   ├── contacts.ts        # payment-gated contact reveal
│   │   ├── maps/              # Google Places + Geocoding
│   │   └── i18n/
│   ├── config/
│   └── types/
└── docs/ARCHITECTURE.md
```

---

## Data model highlights (Phase 0)

### Vehicle classification (database-driven)

- `VehicleClass` table: `code`, localized names (`namePt`/`nameEn`), capacity limits, `sortOrder`, `active`
- `Vehicle.vehicleClassId` and `TripRequest.preferredVehicleClassId` reference it
- `CommissionRule.vehicleClassId` optional override
- Admin CRUD at `/admin/vehicle-classes`; public list via `GET /api/vehicle-classes`

### Money & commission

- All amounts stored as **integer cents** + ISO `currency` (`EUR` default).
- `PlatformSettings` (singleton): `defaultCurrency`, `defaultCommissionPercent`.
- Future: `CommissionRule` overrides by country/category without schema rewrites.

### Driver profile (expanded)

- `photoUrl`, `bio`, `languagesSpoken` (JSON/list)
- `yearsOfExperience`, `ratingAvg`, `ratingCount`
- `completedTripsCount`, `responseRate`, `avgResponseTimeMinutes`
- `documents` (JSON metadata for verification uploads)
- Vehicles as related `Vehicle` records

### Contact privacy

```
canRevealContacts(booking, payment) =>
  payment.status ∈ { AUTHORIZED, CAPTURED } OR booking.status ∈ { PAID, COMPLETED }
```

Reveal only to the two parties of that booking (+ admin). Never on `OFFER_ACCEPTED` / `PENDING_PAYMENT` alone.

---

## i18n

- Locales: `pt` (default), `en`
- URL prefix: `/pt/...`, `/en/...`
- Shared dictionaries under `messages/`
- Server Components use `getTranslations`; client uses `useTranslations`

---

## Google Maps

Env: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`  
Module `src/lib/maps/google.ts`:

- load Maps JS API
- Places Autocomplete helper
- Geocode / reverse-geocode helpers  
UI address fields consume this module in later phases; Phase 0 ships the provider + typed config.

---

## Phased roadmap (reminder)

| Phase | Focus |
|-------|--------|
| **0** | Foundation (this document / this PR) |
| 1 | Core marketplace (trips, offers, accept) |
| 2 | Trust & ops (KYC queue, reviews, expiry cron) |
| 3 | Stripe Connect payments |
| 4 | Scale (fleet, chat, push, more locales) |

---

## Repository naming

Application and package name: **`movio`**.  
GitHub repository should be renamed from `Private` → **`movio`** by the org owner (Settings → General → Repository name). Agent environments cannot rename the remote repo via read-only `gh`.

### Owner steps to rename on GitHub

1. Open https://github.com/fcprivatedriver-debug/Private/settings  
2. Repository name → `movio` → Rename  
3. Update local remotes: `git remote set-url origin https://github.com/fcprivatedriver-debug/movio.git`
