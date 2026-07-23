# Changelog — PR #8

**Branch:** `cursor/movio-mvp-reviewable-7a79`  
**Title:** Reviewable MVP + Demo Mode  
**Date:** 2026-07-23

## Changelog

- Shifted focus from new backend features to a **fully navigable, reviewable MVP**.
- Wired **role-aware navigation** for Customer, Driver, and Admin (header + home CTAs).
- Replaced bare `next/link` with locale-safe navigation on list/dashboard pages.
- Expanded admin home with richer metrics and **clickable recent trips**.
- Trip detail now shows **offers and journey actions for admins**; vehicle ★ on offers.
- Clarified **demo payment** copy when bookings auto-confirm.
- Introduced **Demo Mode** (`PlatformSettings.demoMode`) with a global banner and credentials.
- Added **vehicle ratings** (`ratingAvg` / `ratingCount`) recomputed from completed-trip reviews.
- Replaced thin seed with a **production-scale Demo Mode dataset**.
- Added PR visual-proof process (template, docs, capture script).

## New features

- **Demo Mode** banner across the app when seeded
- **Production demo dataset**: 20 drivers, 20 vehicles, 50 completed trips, reviews, documents, payments, notifications
- **Vehicle ratings** visible on vehicle page and offer cards
- **Customer navigation**: Os meus pedidos + Novo pedido
- **Driver navigation**: Painel, Pedidos abertos, Propostas, Viagens, Veículo, Onboarding
- **Admin navigation**: Admin, Verificações, Classes + trip deep-links
- **Role-aware home CTAs** when logged in
- **Admin ops metrics**: customers, vehicles, payments, reviews
- **Visual proof toolkit**: PR template + `scripts/pr-visual-proof.mjs`

## Demo accounts

Password: `movio123`

| Role | Email |
|------|-------|
| Customer | `cliente@movio.app` |
| Driver | `motorista@movio.app` |
| Admin | `admin@movio.app` |

```bash
npm run db:demo
npm run build && npm run start -- -p 3000
node scripts/pr-visual-proof.mjs --pr 8
```
