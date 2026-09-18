# Tripvo — estado MVP (FASE 1)

Base: branch `tripvo` @ marketplace ZELU (`db4c1af` + rebrand FASE 1).

- Domínio futuro: **https://tripvo.pt**
- Comissão standard: **5%**
- Preview Tripvo (Vercel `private-duur`): **https://private-duur-git-tripvo-fc-private-driver.vercel.app**
- Draft PR: https://github.com/fcprivatedriver-debug/Private/pull/55 (**não mergear para main**)

## Branding

- Wordmark Tipográfico: `TripvoWordmark` (kerning corrigido; T em accent)
- Favicon / icon: marca T (já não “Z”)
- Assets `/brand/tripvo-*.svg` + paths legacy `/brand/zelu-*.svg` redireccionados para Tripvo
- Manifest / metadata / SEO: Tripvo

## Categorias activas

Economy · Comfort · Executivo · Van

## Comissão

`PLATFORM_COMMISSION_PERCENT = 5` → €200 → €10 Tripvo / €190 motorista

## Fluxos

| Fluxo | Estado | Notas |
|-------|--------|-------|
| Cliente — homepage / auth | ✅ funciona | Rebrand Tripvo; tabs Cliente/Motorista |
| Cliente — criar pedido | 🟡 incompleto | Origem, destino, data/hora, passageiros, categoria, voo, bagagem, notas (placa/cadeira via notas). **Sem** campos dedicados para paragens adicionais / cadeira / placa |
| Cliente — receber propostas e escolher | ✅ funciona | Cliente escolhe manualmente; sem auto-assign ao preço mais baixo |
| Motorista — ver pedidos / enviar proposta | ✅ funciona | Preço definido pelo motorista |
| Motorista — onboarding / veículos | ✅ funciona | Classes ECONOMY/COMFORT/EXECUTIVO/VAN |
| Admin | ✅ funciona | Verificações, classes, operações (branding Tripvo) |
| Maps (rota / distância / duração) | ✅ funciona | Google + fallback Nominatim/OSRM |
| Propostas (marketplace) | ✅ funciona | Modelo Offer mantido |
| Reservas / Booking | ✅ funciona | Após aceite da proposta |
| Contactos privados | ✅ funciona | Revelados só após pagamento confirmado (`src/lib/contacts.ts`) |
| Pagamentos Stripe | 🟡 incompleto | Adapter + checkout demo existem; Stripe real só com `PAYMENTS_ENABLED=true` + chaves |
| Comissão 5% | ✅ funciona | UI checkout mostra Comissão Tripvo + líquido motorista |
| Avaliações | ✅ funciona | Review após viagem |

## Legenda

- ✅ funciona
- 🟡 incompleto
- 🔴 não funciona

## Notas

- Não usar preview `addynow` nem produção antiga como Tripvo
- Pagamentos novos: **não** nesta fase
