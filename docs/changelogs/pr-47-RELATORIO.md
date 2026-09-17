# Relatório — Redesign UX/UI + Performance (PR #47)

**REDESIGN + PERFORMANCE PRONTOS PARA REVISÃO**  
PR: https://github.com/fcprivatedriver-debug/Private/pull/47  
**NÃO FOI FEITO DEPLOY.**

---

## 1. Problemas de performance encontrados

- Carregamento de **Hoje** muito pesado (~4,8–5 s)
- `buildTodayBriefing` (calendário, mobilidade, compras, insights) em cada abertura
- `NinaChat` + `SmartSuggestions` no dashboard → chamadas MEL/greeting no client
- Evolução 6 meses: **6×2 agregações sequenciais** em `getDashboardData`
- `getStatsData`: loops semanais/anuais sequenciais
- `include` Prisma a puxar relações completas sem necessidade
- Switch Pessoal/Familiar: `revalidatePath("/", "layout")` + refresh (necessário para isolamento; feedback visual melhorado)

## 2. Causa de cada atraso importante

| Interação | Causa principal |
|-----------|-----------------|
| Abertura Hoje | Server Component com briefing + muitas queries + chat MEL no bundle/load |
| Pessoal↔Familiar | Cookie + revalidate layout + RSC refresh (correcto para isolamento) |
| Nova despesa | Formulário longo (UX); fetch categorias/contas paralelo OK |
| Falar / Captura | InstantCapture client + speech API; load de página leve |
| + FAB (antes) | Navegação directa para captura (sem menu); feedback visual limitado |

## 3. Tempos BEFORE / AFTER

| Métrica | BEFORE | AFTER |
|---------|--------|-------|
| Login | ~5550 ms | ~1350 ms |
| Abertura Hoje | ~4865 ms | **~743 ms** |
| Captura / Falar / Fatura / Compras / Nova despesa | ~580–620 ms | ~600–620 ms (estável) |

Medição: Playwright mobile 390×844, Chromium headless, demo@nina.app.

## 4. Otimizações realizadas

- Removido do load de Hoje: `buildTodayBriefing`, `NinaChat`, `SmartSuggestions`, painéis secundários
- Evolução mensal e stats weekly/annual em **Promise.all**
- Selects Prisma mais estreitos em incomes/expenses/members/accounts
- Prefetch em links da nav
- FAB com abertura imediata de menu (client)
- SpaceSwitcher com `useOptimistic`

## 5. Queries / Server Actions

- `getDashboardData`: evolução 6 meses paralelizada; selects reduzidos
- `getStatsData`: weekly + annual paralelizados
- Sem alteração a Server Actions financeiras / capture / storage

## 6. Bundle / carregamento

- Dashboard deixa de importar `NinaChat` / insights no first paint
- First Load JS partilhado mantém-se ~103 kB (sem libs novas pesadas)
- Sem bibliotecas de animação/gráfico adicionadas

## 7. Nova paleta

| Uso | Código |
|-----|--------|
| Accent teal | `#3db8b0` |
| Teal escuro | `#1f7a74` |
| Teal soft | `#5ec9c2` |
| Teal mist | `#e8f7f6` |
| Fundo | `#f7f9fb` |
| Cards | `#ffffff` |
| Fundo soft | `#eef3f7` |
| Texto | `#1a2332` |
| Texto muted | `#6b7785` |
| Entradas | `#3d9b6e` |
| Despesas | `#d4706a` |
| Alertas | `#c4922a` |

## 8. Design tokens

Ver `docs/DESIGN_TOKENS.md` e `:root` em `src/app/globals.css`  
(`--teal*`, `--bg*`, `--fg*`, `--income/expense/warn`, radius, shadow, spacing, typography, `--dur-fast`).

## 9. Ecrãs redesenhados

- Hoje, Nova despesa, Falar/Captura, Compras, Mais, AppShell (nav + FAB), SpaceSwitcher

## 10. O que foi simplificado

- Menos cards/painéis no Hoje
- Formulário de despesa com campos essenciais primeiro
- Falar sem murais de explicação
- Compras sem texto promocional longo
- Nav inferior mais compacta
- Botões menos “pill gigante”

## 11. Movido para «Mais detalhes» / «Mais»

**Mais detalhes (despesa):** data, hora, subcategoria, espaço, loja, método, membro (familiar), observações  
**Mais:** Família, Orçamentos, Objetivos, Poupança, Transações, Resumo, Recorrentes, Mobilidade, Calendário, Ligações, Preferências MEL, Conta, Privacidade, Guia, Avisos

## 12. Funcionalidades — confirmação

Nenhuma funcionalidade importante removida. Chat MEL / insights / guia / mobilidade / etc. continuam acessíveis via Falar / Mais / rotas existentes.

## 13. Resultado mobile

Layout mobile-first verificado (390×844). FAB teal + nav com safe-area. Touch targets ≥44px na nav.

## 14. Pessoal / Familiar

Separação mantida (cookie `nina_space` + scope server-side). Switcher compacto com feedback imediato (optimistic).

## 15. Acessibilidade

- Roles tablist/tab no switcher e menu FAB
- `aria-expanded` / `aria-controls` no FAB
- Labels em campos; contraste teal sobre branco OK para botões
- Microinterações curtas (`--dur-fast` 120ms)

## 16. Migrations

Nenhuma migration nova. Schema intocado. Hotfix StoredObject (PR #46) preservado.

## 17. Testes realizados

- Medição BEFORE/AFTER (Playwright)
- Login demo + navegação Hoje / Falar / Compras / Despesa / Mais
- Toggle Pessoal↔Familiar (vídeo)
- typecheck, lint, build
- Gravação de fluxo: `/opt/cursor/artifacts/redesign-flow-demo.mp4`

## 18. typecheck / lint / build

- `tsc --noEmit`: OK  
- `eslint`: 0 errors (warnings pré-existentes)  
- `npm run build`: OK  

## 19. Screenshots BEFORE / AFTER

| Ecrã | BEFORE | AFTER |
|------|--------|-------|
| Hoje | `/opt/cursor/artifacts/before/hoje-before.png` | `/opt/cursor/artifacts/after/hoje-after.png` |
| Nova despesa | `.../despesa-nova-before.png` | `.../despesa-nova-after.png` |
| Falar | `.../falar-before.png` | `.../falar-after.png` |
| Compras | `.../compras-before.png` | `.../compras-after.png` |
| Mais | `.../mais-before.png` | `.../mais-after.png` |
| Fatura | `.../fatura-before.png` | `.../fatura-after.png` |

Vídeo: `/opt/cursor/artifacts/redesign-flow-demo.mp4`

## 20. Acção manual antes do deploy

1. Rever PR #47 no telemóvel (PWA Android/iOS)
2. Confirmar que a linha de produção inclui o hotfix #46 (storage Neon)
3. Smoke: login, Pessoal/Familiar, guardar despesa, Anexar fatura, Falar, Compras, logout
4. **Deploy manual** quando aprovado — **não fazer deploy automático**

---

**REDESIGN + PERFORMANCE PRONTOS PARA REVISÃO**  
PR: https://github.com/fcprivatedriver-debug/Private/pull/47
