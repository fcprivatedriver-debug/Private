# Versão canónica addYknow — consolidação

## Mapa de correções (Fase 1)

| Peça | SHA / origem | Em main? |
|------|----------------|----------|
| A) Login layout `{children}` | `a83db05` / PR #51 → merge `88d8788` | Sim |
| B) Landing sem DEMO_CARDS | `dae73ce` (via #53) | Sim |
| C) Novo dashboard | `5cc3a0f` / `cf380a5` | Sim |
| D) Fatura foto #52 | `eced83c` (via #53; PR #52 ainda OPEN na base antiga) | Sim |
| E) StoredObject BYTEA | `d5ae70a` (#48) | Sim |
| F) StoredObject schema `nina` | `d5c35fa` (#54) | Sim |
| G) MEL OpenAI | #42 / #50 | Sim |
| H) Gate MEL «ond» + geo UX | branch `cursor/canonical-stable-ec69` | Este PR |

## Regressão do login

1. `0079b05` colocou a landing em `[locale]/layout.tsx` **sem** `{children}`.
2. PR #51 (`a83db05`) restaurou o layout.
3. Redeploys sucessivos (addynow vs private-duur, SHAs intercalados) fizeram o domínio servir builds diferentes — o sintoma «Entrar → landing» voltou quando o alias apontava para build antigo **ou** misturava flight RSC.

## Branch canónica

`cursor/canonical-stable-ec69` = `main` (8af2d71) + gate MEL + geo UX + stamps de regressão.

**NÃO publicar Production neste passo** — só Preview.
