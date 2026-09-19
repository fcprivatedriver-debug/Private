# Production env checklist — auth / Resend (sem valores secretos)

Confirmado por comportamento em `www.addandknow.pt` após publish `c89b04f`:

| Variável | Evidência (sem revelar valor) | Acção se falhar |
|---|---|---|
| App sobe / login funciona | PASS — formulários + sessão | — |
| `AUTH_SECRET` / Auth.js | PASS — login `familia@nina.app` → dashboard | Settings → Env Production |
| `AUTH_URL` / base links | Código usa `appBaseUrl()`; links não apontam para localhost | Definir `AUTH_URL=https://addandknow.pt` |
| `RESEND_API_KEY` | **Provavelmente PRESENTE** — erro é «Não consegui enviar o email agora.» (API falhou), não «Envio de email não configurado» | Ver logs Resend |
| `EMAIL_FROM` | Default código: `addYknow <no-reply@addandknow.pt>` | Alinhar com domínio verified no Resend |

## Passos exactos no painel Resend

1. [resend.com/domains](https://resend.com/domains) — domínio `addandknow.pt` = **Verified**
2. [resend.com/emails](https://resend.com/emails) — abrir o pedido falhado (registo/reenvio) e ler o erro (domínio, from, quota, …)
3. Confirmar que `EMAIL_FROM` no Vercel **addynow → Production** usa um endereço `@addandknow.pt` autorizado
4. Redeploy Production addynow após corrigir env/DNS se necessário

## Passos exactos no painel Vercel (addynow)

1. [addynow → Settings → Environment Variables](https://vercel.com/fc-private-driver/addynow/settings/environment-variables) (Production):
   - `AUTH_URL` = `https://addandknow.pt`
   - `RESEND_API_KEY` = (chave Resend)
   - `EMAIL_FROM` = `addYknow <no-reply@addandknow.pt>`
2. [addynow → Deployments](https://vercel.com/fc-private-driver/addynow) — Redeploy do Production actual se alteraste env
3. Rollback: Instant Rollback para deployment pré-#56 (ver `docs/pr-proof/pr-56-rollback-record.md`) — **só se regressão de UI**; login/layout actual está PASS
