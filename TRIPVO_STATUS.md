# Tripvo — estado MVP (FASE 1)

Base: branch `tripvo` @ marketplace ZELU (`db4c1af` + rebrand FASE 1).

Domínio futuro: **https://tripvo.pt** · Comissão standard: **5%**

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
| Comissão 5% | ✅ funciona | `PLATFORM_COMMISSION_PERCENT` + `calcPlatformFee` (ex.: €200 → €10 / €190) |
| Avaliações | ✅ funciona | Review após viagem |

## Legenda

- ✅ funciona
- 🟡 incompleto
- 🔴 não funciona
