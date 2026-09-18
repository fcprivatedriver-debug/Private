# Tripvo — estado MVP

Base: branch `tripvo` (marketplace ZELU rebranded).

- Domínio futuro: **https://tripvo.pt**
- Comissão: **5%** (€200 → €10 Tripvo / €190 motorista)
- Preview: **https://private-duur-git-tripvo-fc-private-driver.vercel.app**
- Draft PR: https://github.com/fcprivatedriver-debug/Private/pull/55 (**não mergear**)

## Correção crítica — registo

**Causa:** `PrismaNeonHttp` não suporta nested creates / `$transaction` interactivas.
**Fix:** creates sequenciais em `registerAction` + marketplace (accept/cancel/payment/review).

## Fluxos

| Fluxo | Estado | Notas |
|-------|--------|-------|
| Homepage Tripvo | ✅ funciona | Wordmark + pin, TRAVEL YOUR WAY, trust strip, CTAs |
| Cliente — registo / login | ✅ funciona | Persistência User + CustomerProfile |
| Cliente — pedir viagem | ✅ funciona | Maps + persistência TripRequest |
| Motorista — registo / login | ✅ funciona | User + CustomerProfile + DriverProfile sequenciais |
| Motorista — onboarding / veículo | ✅ funciona | Fluxo existente |
| Propostas marketplace | ✅ funciona | Cliente escolhe; sem auto-assign |
| Comissão 5% | ✅ funciona | `PLATFORM_COMMISSION_PERCENT` + checkout UI |
| Admin — acesso | ✅ funciona | `requireAdmin` + middleware ADMIN-only |
| Admin — protecção roles | ✅ funciona | CUSTOMER/DRIVER → redirect |
| Email novo motorista | 🟡 incompleto | Resend implementado; precisa `RESEND_API_KEY` (+ `EMAIL_FROM` com domínio) |
| Email novo pedido | 🟡 incompleto | Idem |
| Contactos privados | ✅ funciona | Após pagamento |
| Pagamentos Stripe | 🟡 incompleto | Demo checkout; real com `PAYMENTS_ENABLED` + chaves |
| Maps | ✅ funciona | Google + fallback |
| Avaliações | ✅ funciona | Após viagem |

## ENV a configurar no Vercel (Tripvo / private-duur)

- `AUTH_SECRET` (recomendado; existe fallback demo)
- `RESEND_API_KEY` — para emails admin
- `EMAIL_FROM` — ex. `Tripvo <noreply@tripvo.pt>` (domínio verificado no Resend)
- `ADMIN_NOTIFY_EMAIL` — default `fcprivatedriver@gmail.com`
- `PAYMENTS_ENABLED` / Stripe keys — quando activar pagamentos reais

## Legenda

- ✅ funciona · 🟡 incompleto · 🔴 não funciona
