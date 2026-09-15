# add&know — Sabe onde vai o teu dinheiro. Agora.

Aplicação de organização pessoal e financeira com a **MEL**, assistente inteligente.

**Marca:** add&know · **Assistente:** MEL · **Moeda:** EUR · **Idioma:** Português (EN disponível)

> Identidade: add&know = app / produto · MEL = assistente de IA  
> Domínio técnico temporário: `ninapp.pt` (não inventar domínio novo nesta fase)

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
| `EMAIL_FROM` | `add&know <no-reply@ninapp.pt>` |
| `DEMO_MODE` | `false` |
| `NEXT_PUBLIC_APP_NAME` | `add&know` |

## Separação de marca

- UI / PWA / emails visíveis → **add&know** + **MEL**
- Schema Postgres, modelos Prisma `Nina*`, emails `@nina.app`, cookie `nina_space`, domínio `ninapp.pt` → legado técnico preservado de propósito
