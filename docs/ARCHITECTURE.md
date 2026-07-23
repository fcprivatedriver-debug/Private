# Nina — Architecture

> Assistente financeira pessoal para o mercado português.  
> **Brand:** Nina  
> **Moeda:** EUR

---

## Product decisions

| Decision | Choice |
|----------|--------|
| Brand | **Nina** |
| Default currency | **EUR** |
| Locale | Portuguese first (`/pt`), English available |
| Multi-user | Family + FamilyMember with roles (OWNER / ADMIN / MEMBER / VIEWER) |
| Integrations | Adapter layer for retalho, energia, MB Way, Revolut, Open Banking |
| OCR | Pluggable receipt recognition (confirm-before-save) |
| AI | **Nina conversational assistant** (center of UX) + insights engine |

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
nina/
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


---

## Conversational core

The home experience is a chat with **Nina**. Natural-language questions in Portuguese
are answered by `src/lib/ai/nina-assistant.ts` using the family's live financial context.
Menus stay secondary and use everyday language (Gastos, Entradas, Objetivos…).
