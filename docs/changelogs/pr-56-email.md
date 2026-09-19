# PR #56 — Email verification / base URL (canónica)

## Causa exacta de `http://127.0.0.1:3000`

1. `src/lib/auth/security.ts` → `appBaseUrl()` fallback hardcoded `http://127.0.0.1:3000` quando `AUTH_URL` / `NEXT_PUBLIC_APP_URL` ausentes.
2. `resendVerificationEmail` devolvia `previewUrl` com essa base se Resend não marcava `delivered`.
3. `VerifyEmailPending.tsx` fazia `window.location.href = res.previewUrl`.

## Correção

- `appBaseUrl()`: Production → `https://addandknow.pt`; Preview → `VERCEL_BRANCH_URL` / `VERCEL_URL`; Dev → loopback; rejeita loopback deployed.
- `previewUrl` só em development local (`allowDevMailPreview`).
- Reenviar **não navega**; permanece na página.
- Sem `RESEND_API_KEY` em Vercel: erro claro (não finge sucesso).
- Actions devolvem `linkHost` (sem token) para auditoria.

## Teste Preview (`021b9cf`+)

| Gate | Resultado |
|------|-----------|
| EMAIL VERIFICATION (pedido) | PASS |
| REENVIO (permanece / sem 127.0.0.1) | PASS |
| RESEND REAL | FAIL — `RESEND_API_KEY` ausente no Preview private-duur |
| URL DO LINK (`linkHost`) | `*.vercel.app` Preview (não localhost) |
| RESET PASSWORD (UI / host) | PASS UI; FAIL entrega (mesmo Resend) |
| REFS localhost em actions | ZERO |

## Bloqueio env

Configurar no Vercel (projeto que serve addandknow.pt + Preview):

- `AUTH_URL=https://addandknow.pt`
- `RESEND_API_KEY`
- `EMAIL_FROM=addYknow <no-reply@addandknow.pt>`

**AINDA NÃO RESOLVIDO** para entrega real de email até Resend estar no Preview.
