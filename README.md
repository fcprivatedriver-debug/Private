# addYknow — Sabe onde vai o teu dinheiro. Agora.

Aplicação de organização pessoal e financeira com a **MEL**, assistente inteligente.

**Marca:** addYknow · **Assistente:** MEL · **Moeda:** EUR · **Idioma:** Português (EN disponível)

> Identidade: addYknow = app / produto · MEL = assistente de IA  
> Domínio técnico temporário: `addandknow.pt` (não inventar domínio novo nesta fase)

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js · Prisma · PostgreSQL
- next-intl (`/pt`, `/en`)
- Módulos: OCR, importações, IA, exportação, ligações opcionais

## Arranque local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
# demo só em desenvolvimento:
DEMO_MODE=true npm run db:demo
npm run dev
```

### Contas de desenvolvimento (nunca em produção)

| Pessoa | Email | Password |
|--------|-------|----------|
| Família (vazia) | `familia@nina.app` | `nina123` |
| Demo seed | `demo@nina.app` | `nina123` |

Em produção, `DEMO_MODE` fica forçado a `false`.

## Produção

Ver `docs/DEPLOY_VERCEL.md`. Variáveis críticas:

| Variável | Notas |
|----------|-------|
| `DATABASE_URL` / `DIRECT_URL` | Neon, schema `nina` (legado técnico) |
| `AUTH_SECRET` | Obrigatório |
| `RESEND_API_KEY` | Obrigatório para emails reais |
| `EMAIL_FROM` | `addYknow <no-reply@addandknow.pt>` |
| `DEMO_MODE` | `false` |
| `NEXT_PUBLIC_APP_NAME` | `addYknow` |

## Separação de marca

- UI / PWA / emails visíveis → **addYknow** + **MEL**
- Schema Postgres, modelos Prisma `Nina*`, emails `@nina.app`, cookie `nina_space`, domínio `addandknow.pt` → legado técnico preservado de propósito
