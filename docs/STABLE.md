# Nina — ambiente estável

## Causa raiz dos problemas

1. **Offline / links Cloudflare**
   - Túnel `*.trycloudflare.com` é **efémero** (morre com o processo).
   - O **Service Worker / PWA** guardava `offline.html` e, quando o túnel caía, a app parecia “Offline” para sempre.
   - **Correção:** SW `nina-v1-2-stable` — sem SW em hosts efémeros; botão “Remover app em cache”; network-first.

2. **Vercel “Deployment has failed”**
   - Antes: `prisma migrate deploy` chocava com o schema **Zrik** na Neon partilhada (P3009).
   - **Correção:** schema PostgreSQL `nina` + `migrate-deploy.mjs` + `vercel-build.mjs`.
   - Builds Nina passam a **Ready**.

3. **URL Vercel não abre no telemóvel**
   - O deploy está **Ready**, mas o projeto tem **Vercel Authentication (SSO)** em todos os deployments.
   - Visitantes anónimos são redirecionados para `vercel.com/login` — parece que a app “não carrega”.
   - **Correção automática:** `scripts/make-vercel-public.mjs` desativa SSO se existir `VERCEL_TOKEN` / `NINA_VERCEL_TOKEN` no ambiente Vercel.
   - **Ação necessária uma vez (dono do projeto):** em Vercel → Project → Settings → Deployment Protection → desativar **Vercel Authentication**, **ou** adicionar o secret `NINA_VERCEL_TOKEN` (token da conta) nas Environment Variables.

## URL estável

Após desativar o SSO, o URL estável do branch `nina` será:

`https://private-duur-git-nina-fc-private-driver.vercel.app`

(ou o alias de production se configurado)
