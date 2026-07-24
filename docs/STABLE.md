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

3. **URL Vercel não abre no telemóvel (bloqueio atual)**
   - O deploy está **Ready**, mas o projeto tem **Vercel Authentication (SSO)** em todos os deployments.
   - Visitantes anónimos são redirecionados para `vercel.com/login` — parece que a app “não carrega”.
   - Sem `VERCEL_TOKEN` / `NINA_VERCEL_TOKEN`, o agente **não consegue** desativar o SSO nem testar o URL público.

## Ação única (dono do projeto) — desbloquear URL público

Escolhe **uma** das opções:

### Opção A (mais rápida, no telemóvel)

1. Abre [Vercel → private-duur → Settings → Deployment Protection](https://vercel.com/fc-private-driver/private-duur/settings/deployment-protection)
2. Desativa **Vercel Authentication**
3. Guarda

### Opção B (automática nos próximos builds)

1. Cria um token em [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Em Project → Settings → Environment Variables, adiciona `NINA_VERCEL_TOKEN` = esse token (Production + Preview)
3. Faz Redeploy — o build corre `scripts/make-vercel-public.mjs` e desativa o SSO

## URL estável (após desativar SSO)

`https://private-duur-git-nina-fc-private-driver.vercel.app`

Alias do branch `cursor/nina-stable-c6cd`:

`https://private-duur-git-cursor-nina-stable-c6cd-fc-private-driver.vercel.app`

## 4. Dashboard / saldos / gráficos desatualizados após criar ou editar

- **Causa:** `IncomeForm` e `ExpenseForm` faziam `router.push(...)` sem `router.refresh()` após sucesso. O delete já refresca; os outros formulários também. O RSC cache do Next.js mantinha listas, saldos e gráficos antigos.
- **Ficheiros:** `src/components/finance/Forms.tsx` (e o mesmo padrão em `OcrClient.tsx`).
- **Correção:** após `create`/`update` bem-sucedido, `router.push` + `router.refresh()` (igual a `TransactionActions.tsx`).
- **Impacto:** listas, Dashboard, gráficos e saldos passam a refletir receitas/despesas novas ou editadas sem hard-reload.

## O que já está corrigido sem SSO

- Build Vercel **Ready**
- Schema `nina` isolado da Zrik
- PWA sem Offline em túneis efémeros
- Contas novas vazias; demo só com `DEMO_MODE=true`
- Refresh após criar/editar receita e despesa

## Processo

Ver `docs/DEV_PROCESS.md` — checkpoint Git antes de alterações; checklist `familia@nina.app` depois.
