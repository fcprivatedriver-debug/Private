# MAFIL — Architecture

> Gestão Financeira Familiar para o mercado português.  
> **Brand:** MAFIL  
> **Moeda:** EUR

---

## Product decisions

| Decision | Choice |
|----------|--------|
| Brand | **MAFIL** |
| Default currency | **EUR** |
| Locale | Portuguese first (`/pt`), English available |
| Multi-user | Family + FamilyMember with roles (OWNER / ADMIN / MEMBER / VIEWER) |
| Integrations | Adapter layer for retalho, energia, MB Way, Revolut, Open Banking |
| OCR | Pluggable receipt recognition (confirm-before-save) |
| AI | Heuristic insights engine (swap-ready for LLM) |

---

## Stack

| Layer | Choice |
|-------|--------|
| App | Next.js 15 App Router + TypeScript |
| UI | Tailwind v4 + design tokens (navy / white / soft gray) |
| DB | Prisma + PostgreSQL (Neon in prod, local PG in dev) |
| Auth | Auth.js (credentials + optional Google) |
| Validation | Zod |
| i18n | next-intl |

---

## Folder structure

```
mafil/
├── prisma/
├── messages/
├── src/
│   ├── app/[locale]/
│   │   ├── (app)/          # authenticated area
│   │   ├── login|registo
│   │   └── page.tsx        # landing
│   ├── actions/finance.ts
│   ├── components/
│   ├── domain/             # categories, finance math
│   └── lib/
│       ├── ocr/
│       ├── imports/
│       ├── ai/
│       ├── export/
│       └── queries.ts
```

---

## Modular integrations

Each import provider implements `ImportAdapter` in `src/lib/imports`.  
OCR lives in `src/lib/ocr`. AI insights in `src/lib/ai/finance-insights`.  
Future Open Banking and email invoice reading plug into the same seams without UI rewrites.

---

## Security roadmap

- Credentials + OAuth (Google / Apple)
- PIN + biometrics flags on User (native clients)
- HTTPS encryption in transit
- Automated backups via managed Postgres
- Explicit user consent for third-party imports
