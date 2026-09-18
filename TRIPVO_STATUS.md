# Tripvo — estado MVP

Base: branch `tripvo` (marketplace ZELU rebranded).

- Domínio futuro: **https://tripvo.pt**
- Comissão: **5%** (€200 → €10 Tripvo / €190 motorista)
- Preview: **https://private-duur-git-tripvo-fc-private-driver.vercel.app**
- Draft PR: https://github.com/fcprivatedriver-debug/Private/pull/55 (**não mergear**)
- HEAD: ver `git log -1` em `tripvo`

## Correção crítica — registo

**Causas reais no Preview Neon:**
1. Nested creates / `$transaction` incompatíveis com PrismaNeonHttp
2. Schema drift: `CustomerProfile.defaultCurrency` em falta; `updatedAt` NOT NULL sem default
3. Schema drift: `DriverProfile.status` e colunas relacionadas em falta
4. Raw INSERT com aspas duplas (PG identifiers) — corrigido para aspas simples

**Fix:** creates sequenciais + `repairCustomerProfileColumns` / `repairDriverProfileColumns` (ALTER IF NOT EXISTS, sem DROP) + raw INSERT com timestamps.

## Fluxos

| Fluxo | Estado | Notas |
|-------|--------|-------|
| Homepage Tripvo | ✅ funciona | Wordmark Trip+vo+pin, TRAVEL YOUR WAY, trust strip |
| Cliente — registo / login | ✅ funciona | Verificado no Preview |
| Cliente — pedir viagem | 🟡 incompleto | Form + Maps existem; E2E form automation parcial |
| Motorista — registo / login | ✅ funciona | Verificado no Preview → `/onboarding` |
| Motorista — onboarding / veículo | ✅ funciona | Fluxo existente |
| Propostas marketplace | ✅ funciona | Cliente escolhe; sem auto-assign |
| Comissão 5% | ✅ funciona | Constant + checkout UI |
| Admin — acesso | ✅ funciona | `requireAdmin` + middleware |
| Admin — protecção roles | ✅ funciona | CUSTOMER/DRIVER/guest negados no Preview |
| Email novo motorista | 🟡 incompleto | Resend pronto; falta `RESEND_API_KEY` |
| Email novo pedido | 🟡 incompleto | Idem |
| Contactos privados | ✅ funciona | Após pagamento |
| Pagamentos Stripe | 🟡 incompleto | Demo; real com `PAYMENTS_ENABLED` + chaves |
| Maps | ✅ funciona | Google configurado no Preview |
| Avaliações | ✅ funciona | Após viagem |

## ENV a configurar (Vercel `private-duur`)

| Variável | Estado | Notas |
|----------|--------|-------|
| `DATABASE_URL` / `DIRECT_URL` | ✅ | Neon |
| `AUTH_SECRET` | 🟡 | Usa demo-fallback — definir em produção |
| `RESEND_API_KEY` | 🔴 necessário | Emails admin |
| `EMAIL_FROM` | 🔴 recomendado | Domínio verificado no Resend |
| `ADMIN_NOTIFY_EMAIL` | default | `fcprivatedriver@gmail.com` |
| `PAYMENTS_ENABLED` + Stripe | 🟡 | Quando activar pagamentos |

## Conta Admin

Seed: `admin@tripvo.app` (após `npm run db:demo`). Sem seed no Preview partilhado, criar manualmente role ADMIN na DB.

## Legenda

- ✅ funciona · 🟡 incompleto · 🔴 não funciona
