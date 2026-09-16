# Relatório — Alimentação e atualização automática de dados externos

Data: 2026-09-16  
Branch: `cursor/external-data-sync-ec69`  
Aplicação: addYknow · Assistente: MEL · Domínio: addandknow.pt  
**Sem deploy.**

## Tabela-resumo

| FONTE | MÉTODO ENCONTRADO | AUTOMÁTICO? | FREQUÊNCIA | DADOS OBTIDOS | UTILIZAÇÃO COMERCIAL | ESTADO |
|-------|-------------------|-------------|------------|---------------|----------------------|--------|
| Continente | Sem API pública; robots.txt bloqueia pesquisa (`*q=*`). | Não possível | Manual (CSV/JSON) | Nenhum via auto; import preparado | Requer autorização | Importação manual pronta |
| Pingo Doce | Sem API pública; SFCC/Demandware bloqueado em robots | Não possível | Manual (CSV/JSON) | Nenhum via auto; import preparado | Requer autorização | Importação manual pronta |
| Auchan | Sem API/dataset público de preços encontrado | Não possível | Manual (CSV/JSON) | Nenhum via auto; import preparado | Requer autorização | Importação manual pronta |
| Combustíveis (DGEG) | API portal `/api/PrecoComb/PesquisarPostos` (live 200) | Possível (gated) | diária via cron (+ admin) | Syncer implementado; **0 postos em cache** até Partilha | **Proibida** sem Partilha | Código pronto; sync OFF |
| MOBI.E / MOBI.Data Lisboa | GeoJSON CC0 ArcGIS `POITransportes` layer 2 + dados.gov | Possível | Diária (+ cron 04:30 UTC) | **157 estações reais** sincronizadas nos testes | Permitida (CC0) | **Activo** |
| miio | Sem via pública legítima encontrada | Não | — | — | — | Indisponível |
| DATEX / NAP AFIR | Endpoint pesado (~192MB); timeout | Incerta | — | Não sincronizado | Incerta | Preparado como futuro |

### Conformidade por fonte

| Fonte | Acesso técnico | Automatização | Restrições |
|-------|----------------|---------------|------------|
| Continente | Não | Não possível | robots Disallow pesquisa |
| Pingo Doce | Não | Não possível | robots SFCC |
| Auchan | Não | Não possível | Sem feed público |
| DGEG | Sim | Possível | «proibida a sua utilização para fins comerciais» — Partilha: precoscombustiveis@dgeg.gov.pt |
| MOBI Lisboa | Sim | Possível | CC0; só estático (sem tarifa/disponibilidade) |
| miio | Não | Não possível | App móvel / sem API pública documentada |

---

## 1. O que ficou realmente implementado

- Schema Prisma + migration `20260916180000_external_data_cache` (`ExternalDataSync`, `ExtFuelStation/Price`, `ExtChargingStation`, `ExtProduct/Price`).
- Framework de sync com logging, lock anti-duplicado, estados SUCCESS/PARTIAL/FAILED (falha **não** apaga dados).
- Syncer **MOBI.E Lisboa CC0** (GeoJSON verificado live).
- Syncer **DGEG** completo, gated por `DGEG_FUEL_ENABLED` + `DGEG_PARTILHA_ACK`.
- Importação manual CSV/JSON de supermercados com validação (preço, moeda, datas); linhas inválidas rejeitadas.
- Providers combustível/EV/supermercado leem **apenas** a cache BD (zero inventados).
- Cron protegido `GET/POST /api/cron/external-data` (`CRON_SECRET`) + `vercel.json`.
- Painel admin `/pt/admin/dados-externos` («Atualizar agora» + import) com chave admin.
- MEL tools: `find_nearby_fuel`, `find_nearby_chargers`, `compare_shopping_basket` (só cache real + frescura).
- TTL/stale + labels «Atualizado há X».

## 2. O que ficou apenas preparado

- Sync automático Continente / Pingo Doce / Auchan (recusa explícita → import).
- DATEX/NAP AFIR / OCPI MOBI.E nacional (sem credenciais; payload inviável no cron Vercel).
- miio.
- Disponibilidade e tarifas EV dinâmicas (fonte Lisboa não as fornece).
- Sync DGEG em produção (aguarda Partilha).

## 3. Fontes a devolver dados reais (testes)

- **MOBI.E Lisboa**: sim — 157 carregadores.
- **DGEG**: API live verificada; sync **bloqueado** sem Partilha → 0 postos em cache.
- **Supermercados**: 0 produtos em cache (import testado e amostra de teste removida).

## 4. Quantidades nos testes

| Tipo | Quantidade |
|------|------------|
| Carregadores MOBI Lisboa | **157** |
| Postos combustível | **0** (gate Partilha) |
| Produtos supermercado | **0** (após limpeza do smoke) |

## 5. Frequência configurada

| Fonte | Frequência |
|-------|------------|
| MOBIE_LISBOA | Diária 04:30 UTC (+ botão admin) |
| DGEG_FUEL | Cada 6h **se** env autorizado |
| Supermercados | Manual only |

## 6. Cache / TTL

| Tipo | Refresh alvo | Stale após |
|------|--------------|------------|
| Combustível | 6 h | 24 h |
| EV estático | 24 h | 7 dias |
| EV dinâmico (futuro) | 15 min | 2 h |
| Produtos | 24 h | 48 h |

## 7. Atualização automática

- Vercel Cron → `/api/cron/external-data` com `Authorization: Bearer $CRON_SECRET`.
- Corre MOBI Lisboa; DGEG só com gates.

## 8. Atualização manual

- `/pt/admin/dados-externos` — chave `EXTERNAL_DATA_ADMIN_KEY` (ou `PRODUCT_ACCESS_ADMIN_KEY`).
- Botão por fonte; mostra última tentativa/sucesso/erros/contagens.

## 9. Importação manual

- JSON array ou CSV (`name,brand,price,…`) no mesmo painel.
- Validação; rejeição parcial sem apagar histórico válido.

## 10. Migrations

- `prisma/migrations/20260916180000_external_data_cache/migration.sql`

## 11. Env vars

| Var | Função |
|-----|--------|
| `CRON_SECRET` | Auth do cron |
| `EXTERNAL_DATA_ADMIN_KEY` | Painel admin (fallback: `PRODUCT_ACCESS_ADMIN_KEY`) |
| `DGEG_FUEL_ENABLED` | Liga sync DGEG |
| `DGEG_PARTILHA_ACK` | Confirma Partilha comercial |
| `MOBIE_LISBOA_SYNC_ENABLED` | Default on; `false` desliga |

## 12. Custos externos

- **0 €** nesta fase (só fontes gratuitas/CC0 + portal DGEG gated).
- Sem proxies, scraping services, datasets pagos.

## 13. Restrições / licenças

- DGEG: uso comercial proibido sem Partilha.
- Lisboa MOBI.E: CC0 (CM Lisboa / dados.gov).
- Continente/PD: robots + ausência de API → sem scrape.

## 14. Testes executados

- Unit: parsers DGEG, mapper MOBI, import CSV/validação, frescura, geo, auth cron/admin (12).
- MEL tools/security + system prompt actualizados.
- audit-fixes (providers honestos).
- Smoke live: sync 157 carregadores; DGEG bloqueado; autosync supermercados recusado; import valida/rejeita.
- typecheck OK · lint 0 errors · build OK.

## 15. Typecheck / lint / build

- `npm run typecheck` — OK  
- `npm run lint` — 0 errors (warnings pré-existentes)  
- `npm run build` — OK  

## 16. Acções manuais do Filipe

1. Pedir **Partilha de Informação** DGEG (`precoscombustiveis@dgeg.gov.pt`) se quiser combustíveis em produção comercial.
2. Definir na Vercel: `CRON_SECRET`, `EXTERNAL_DATA_ADMIN_KEY`; após Partilha: `DGEG_FUEL_ENABLED=true` + `DGEG_PARTILHA_ACK=true`.
3. Aplicar migration em produção (`db:deploy`) quando fizer deploy (esta tarefa **não** faz deploy).
4. Importar CSV/JSON de supermercados se tiver fonte legítima interna.
5. Avaliar registo NAP/AFIR / OCPI para EV nacional + tarifas.

## 17. Continua indisponível e porquê

- Preços Continente/PD/Auchan automáticos — sem API/autorização; robots bloqueiam.
- Preços combustível na app — falta Partilha DGEG.
- EV fora de Lisboa / disponibilidade / €/kWh — Lisboa CC0 é estático; DATEX/OCPI sem acesso prático.
- miio — sem interface pública legítima.
