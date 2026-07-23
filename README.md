# MAFIL — Gestão Financeira Familiar

Aplicação moderna para controlar receitas e despesas da família, orçamentos, objetivos de poupança e insights com IA. Feita para Portugal (EUR, retalho, energia, Open Banking).

**Brand:** MAFIL · **Moeda:** EUR · **Idioma:** Português (EN disponível) · **Base de dados:** PostgreSQL

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (credentials + Google opcional) · Prisma · PostgreSQL
- next-intl (`/pt`, `/en`)
- Arquitetura modular: OCR, importações, IA, exportação, Open Banking stubs

## Arranque local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Conta demo

| Email | Password |
|-------|----------|
| `familia@mafil.pt` | `mafil123` |
| `ana@mafil.pt` | `mafil123` |

## Funcionalidades

- Dashboard: saldo, receitas, despesas, poupança, orçamento %, objetivos, últimas despesas, próximos pagamentos, gráficos
- Receitas e despesas com categorias PT
- OCR de faturas (confirmar dados)
- Importações (Continente, Galp, MB Way, CSV, …)
- Orçamentos com alertas 75/90/100%
- Estatísticas, pesquisa, filtros, alertas, recorrentes
- Multiutilizador familiar
- Tema claro / escuro
- Exportação PDF / Excel / CSV
- Assistente IA (hábitos, anomalias, previsão)

## Ambiente

| Variável | Exemplo |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `DIRECT_URL` | PostgreSQL (migrate) |
| `AUTH_SECRET` | 32+ chars |
| `NEXT_PUBLIC_APP_NAME` | `MAFIL` |

Ver `docs/ARCHITECTURE.md` e `docs/PR_VISUAL_PROOF.md`.
