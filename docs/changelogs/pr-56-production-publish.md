# PR #56 — Publish Production addynow (2026-09-19)

## Publicado

| Campo | Valor |
|---|---|
| Merge #56 | `c89b04f` |
| Hotfix #57 (mail UX) | `d92d5a6` (tip Production) |
| Projeto Vercel | **addynow** |
| Deployment Production | `https://addynow-e7ku9h13b-fc-private-driver.vercel.app` (id `6540929441`) |
| Domínio | `https://www.addandknow.pt` |

## Rollback registado (pré-publish)

Ver `docs/pr-proof/pr-56-rollback-record.md` — fingerprint HTML sha256 `0ebf731c…` (landing). Instant Rollback no addynow se necessário.

## Validações em www.addandknow.pt

| # | Critério | Resultado |
|---|---|---|
| 1 | Entrar / Criar conta (clique + directo + mobile) | **PASS** |
| 2 | Conta verificada → dashboard + sessão após reload | **PASS** (`familia@nina.app`) |
| 3 | Password errada, sem reenvio | **PASS** |
| 4 | Registo + reenvio + **recepção real** de email | **FAIL entrega** — Resend devolve erro («Não consegui enviar…»); UI já não finge sucesso (#57). Sem comprovação de inbox. |

Artefactos: `docs/pr-proof/pr-56-prod-validation/` e `/opt/cursor/artifacts/screenshots/pr-56-prod-validation/`.

## Bloqueio restante (email)

`RESEND_API_KEY` parece presente (erro de API, não «não configurado»). Falta corrigir no painel Resend/Vercel — ver `docs/PRODUCTION_ENV_CHECKLIST.md`.
