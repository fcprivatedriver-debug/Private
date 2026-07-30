# Mel — Deploy Vercel (Neon partilhada)

## Pré-requisitos

- Conta Vercel ligada ao GitHub (`fcprivatedriver-debug/Private`)
- Projecto Vercel: **`private-duur`** (team `fc-private-driver`)
- Integração GitHub → Vercel activa (preview automático por push/PR)
- Projecto Neon com PostgreSQL (a mesma BD que o ZRIK)

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

Define para **Preview** e **Production**:

| Variável | Valor |
|----------|--------|
| `DATABASE_URL` | Neon **pooled** (`-pooler` no host). Opcional: `?schema=mel` — o build força `schema=mel` na mesma. |
| `DIRECT_URL` | Neon **direct** (sem `-pooler`), usada pelo Prisma Migrate |
| `AUTH_SECRET` | String aleatória com **32+ caracteres** (não uses o valor de exemplo) |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_NAME` | `Mel` |
| `MEL_PG_SCHEMA` | `mel` (opcional; o código já assume `mel` em Vercel) |

Opcional: `DEMO_MODE=true` só em Preview.

## Obter as connection strings na Neon

1. Abre a [consola Neon](https://console.neon.tech) → o teu projecto.
2. **Connection Details** (ou Dashboard → Connect).
3. Copia:
   - **Pooled connection** → cola em `DATABASE_URL` no Vercel.
   - **Direct connection** → cola em `DIRECT_URL` no Vercel.
4. Garante `sslmode=require`. Não commits estas URLs no repositório.

## Aviso crítico — Neon partilhada com ZRIK

- A **Mel** usa exclusivamente o schema PostgreSQL **`mel`**.
- O **ZRIK** continua no schema **`public`**.
- **NUNCA** executes `prisma migrate reset`, `prisma db push` destrutivo, nem migrations sem o schema `mel` na BD de produção — podes apagar dados do ZRIK.
- O script `scripts/migrate-deploy.mjs` força `schema=mel` e cria `CREATE SCHEMA IF NOT EXISTS "mel"` antes de aplicar migrations.

## Preview automático

1. Faz push no ramo `cursor/mel-assistente-pessoal-0ecb` (ou outro PR).
2. A integração Vercel constrói o Preview.
3. O URL aparece no comentário do bot Vercel no PR (ex.: `https://private-duur-….vercel.app`).

## Promover para produção (depois de estável)

1. Confirma que o Preview da Mel está saudável (`/pt`, login demo, `/api/health`).
2. Merge do PR para `main` **só quando quiseres substituir o ZRIK na main** — ou configura um domínio / projecto Vercel separado para Mel.
3. Em Production, confirma as mesmas env vars (`NEXT_PUBLIC_APP_NAME=Mel`, `AUTH_SECRET`, Neon URLs).
4. O build de produção corre `prisma migrate deploy` apenas no schema `mel`.

## Seed (opcional, manual)

Com `DATABASE_URL` / `DIRECT_URL` de produção apontando ao schema mel (nunca reset):

```bash
MEL_PG_SCHEMA=mel npm run db:seed
```

Contas demo: `filipe@mel.app` / `mel123`.
