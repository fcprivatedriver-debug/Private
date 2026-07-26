# Deploy Nina → Vercel / ninapp.pt

Nina usa **PostgreSQL** (Neon, schema `nina`) + Auth.js + Resend.

## Produção

- Domínio: **https://ninapp.pt**
- Projeto Vercel: `private-duur` (team `fc-private-driver`)
- Branch de produção: `main` (após merge do PR #22)

## Variáveis de ambiente (Production)

| Nome | Valor |
|------|--------|
| `DATABASE_URL` | Neon (com schema `nina` se aplicável) |
| `DIRECT_URL` | Neon unpooled |
| `AUTH_SECRET` | segredo longo aleatório |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://ninapp.pt` |
| `NEXT_PUBLIC_APP_URL` | `https://ninapp.pt` |
| `EMAIL_FROM` | `Nina <no-reply@ninapp.pt>` |
| `RESEND_API_KEY` | chave Resend |
| `DEMO_MODE` | `false` (produção) |

## Domínio na Vercel

1. Settings → Domains → adicionar `ninapp.pt` (primary)
2. Adicionar `www.ninapp.pt` com redirect → `ninapp.pt`
3. Desativar **Vercel Authentication** (Deployment Protection)
4. SSL é emitido automaticamente após DNS correcto

Ou com token:

```bash
VERCEL_TOKEN=xxx node scripts/configure-ninapp-domain.mjs
```

## DNS web (fornecedor PTDNS)

| Tipo | Nome/Host | Valor | TTL |
|------|-----------|-------|-----|
| A | `@` | `76.76.21.21` | 300 |
| CNAME | `www` | `cname.vercel-dns.com` | 300 |

Remove o A antigo (`193.29.59.104`) se existir. Confirma valores no dashboard Vercel.

## Resend (`no-reply@ninapp.pt`)

1. [Resend → Domains](https://resend.com/domains) → Add Domain → `ninapp.pt`
2. Copia os registos exactos (DKIM / SPF / MX no subdomínio `send`)
3. Define `EMAIL_FROM=Nina <no-reply@ninapp.pt>` e `RESEND_API_KEY` na Vercel
4. Redeploy

Ver `docs/STABLE.md` secção Resend para o modelo de registos.

## Checklist go-live

Ver checklist no final de `docs/STABLE.md`.
