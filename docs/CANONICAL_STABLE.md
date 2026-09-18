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
| I) Email base URL (sem 127.0.0.1) | este PR | Este PR |

## Regressão do login

1. `0079b05` colocou a landing em `[locale]/layout.tsx` **sem** `{children}`.
2. PR #51 (`a83db05`) restaurou o layout.
3. Redeploys sucessivos (addynow vs private-duur, SHAs intercalados) fizeram o domínio servir builds diferentes — o sintoma «Entrar → landing» voltou quando o alias apontava para build antigo **ou** misturava flight RSC.

## Bug crítico — Reenviar email → 127.0.0.1:3000

### Causa exacta

1. `src/lib/auth/security.ts` → `appBaseUrl()` fazia fallback hardcoded para `http://127.0.0.1:3000` quando `AUTH_URL` / `NEXT_PUBLIC_APP_URL` estavam ausentes.
2. `resendVerificationEmail` devolvia `previewUrl` com essa base quando Resend não marcava `delivered`.
3. `VerifyEmailPending.tsx` fazia `window.location.href = res.previewUrl` → o browser no telemóvel abria `127.0.0.1:3000` (ERR_CONNECTION_REFUSED).

### Correção

- `appBaseUrl()` central: Production → `https://addandknow.pt`; Preview → `https://$VERCEL_URL`; Dev local → loopback; rejeita loopback em deployed.
- `allowDevMailPreview()` — `previewUrl` só em development local.
- Reenviar email **nunca navega**; permanece na página e mostra «Email enviado…».
- Reset password + convites usam a mesma base.

### Env

- Production deve ter `AUTH_URL=https://addandknow.pt` (e opcionalmente `NEXT_PUBLIC_APP_URL`).
- Sem token Vercel neste ambiente o agente **não** listou env vars — o Preview private-duur respondeu `Envio de email não configurado` ⇒ `RESEND_API_KEY` ausente no Preview.
- Código já não depende de fallback localhost; links usam `linkHost` Preview/`addandknow.pt`.

### Resultado Preview (pós-fix)

| Gate | Resultado |
|------|-----------|
| EMAIL VERIFICATION | PASS |
| REENVIO (sem 127.0.0.1) | PASS |
| RESEND REAL | FAIL (sem `RESEND_API_KEY` no Preview) |
| URL DO LINK | domínio Preview `*.vercel.app` (não localhost) |
| RESET PASSWORD | PASS UI / FAIL entrega Resend |
| REFS localhost | ZERO |

**AINDA NÃO RESOLVIDO** para entrega real até Resend no Preview/Production correcto.

## Branch canónica

`cursor/canonical-stable-ec69` — Preview only.

**NÃO publicar Production neste passo** — só Preview.
