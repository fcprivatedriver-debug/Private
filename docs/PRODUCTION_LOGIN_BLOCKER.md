# Produção addandknow.pt — diagnóstico login (2026-09-19)

## Estado confirmado

| Superfície | Resultado `/pt/login` | Evidência |
|---|---|---|
| **https://www.addandknow.pt/pt/login** | LANDING (FAIL) | HTML = landing-v2; sem `auth-card` / `Olá outra vez`; `LoginForm` só no RSC flight |
| **https://addynow.vercel.app/pt/login** | LANDING (FAIL) | **sha256 idêntico** ao domínio público → o domínio está no projeto **addynow** |
| Preview private-duur `cursor/canonical-stable-ec69` @ `7dc2ef4` | FORMULÁRIO (PASS) | `auth-card` + `Olá outra vez` |
| `origin/main` @ `8af2d71` | código OK (`{children}`) | layout restaurado desde merge #51 (`88d8788`) |
| PR #56 @ `7dc2ef4` | código OK + auth/email | Preview PASS |

## Causa em produção (confirmada)

1. O commit `0079b05` removeu `{children}` do `src/app/[locale]/layout.tsx` e embutiu a landing no layout.
2. O fix de código já está em `main` (`88d8788`+) e no PR #56.
3. O **alias de Production do projeto Vercel `addynow`** (e portanto `www.addandknow.pt`) **continua a servir o build partido** (assinatura RSC: landing no segmento locale; `LoginForm` órfão no flight).
4. Há deploys Production posteriores com layout correcto (ex.: `8af2d71` → `addynow-h07r6g0bp-…`), mas o domínio / `addynow.vercel.app` **não** aponta para eles. O deployment `0079b05` recebeu statuses “completed” repetidos (último visto 2026-09-19) — compatível com **Instant Rollback** / alias preso no build antigo.
5. `Production – private-duur` em SHAs recentes de `main` **FAILED** (ex. `8af2d71`). O Preview do PR #56 em private-duur está OK; Production private-duur não é o que serve o domínio hoje.

Isto **não** se resolve só com mais commits no Preview: o site público precisa de **promote / reassign do alias Production no projeto `addynow`**.

## Emails (Resend)

- Preview private-duur: resposta controlada «Envio de email não configurado neste ambiente.» ⇒ `RESEND_API_KEY` ausente no Preview.
- Sem `VERCEL_TOKEN` neste agente: **não** foi possível listar/editar env vars do `addynow` Production.
- Código (PR #56) já: falha clara sem chave; links via `appBaseUrl()` (nunca localhost em deployed); resend só no clique.

### Onde configurar (sem colar segredos no chat)

Projeto Vercel: **[addynow](https://vercel.com/fc-private-driver/addynow)** → Settings → Environment Variables (**Production**):

| Variável | Valor esperado |
|---|---|
| `AUTH_URL` | `https://addandknow.pt` |
| `NEXT_PUBLIC_APP_URL` | `https://addandknow.pt` (opcional, alinhado) |
| `RESEND_API_KEY` | chave Resend do projeto |
| `EMAIL_FROM` | `addYknow <no-reply@addandknow.pt>` |

Resend: domínio `addandknow.pt` **Verified** em [resend.com/domains](https://resend.com/domains) (DNS SPF/DKIM). Ver também `docs/STABLE.md`.

Repetir a chave no Preview `private-duur` (e/ou `addynow` Preview) se quiseres aceitação real de email **antes** do promote.

## Âmbito do PR #56 (além do login)

Além de layout/auth/email, o PR inclui: HardNavLink, MEL utterance-gate «ond», InstantCapture/geo UX, scripts de aceitação, docs/proof. **Não é um cherry-pick mínimo.**

Opções de publicação:

| Opção | O que promove | Risco |
|---|---|---|
| **A — mínimo layout** | Promote Production `addynow` para `main` @ `8af2d71` (ou SHA ≥ `88d8788` com `{children}`) | Corrige `/pt/login` e `/pt/registo`; **não** inclui auth credentials-first / appBaseUrl / resend on-page do #56 |
| **B — completo #56** | Merge #56 → `main`, depois Promote Production `addynow` para o SHA do merge | Login + auth + email URL + MEL gate; maior superfície |
| **C — não misturar Tripvo** | PR #55 fica fora | Obrigatório |

## Passo exacto em falta para o domínio público

1. Em Vercel → **addynow** → Deployments: promover (Promote to Production) um SHA com layout canónico — no mínimo `8af2d71`, preferível o tip de #56 após merge aprovado.
2. Confirmar que `https://www.addandknow.pt/pt/login` passa a ter `data-addyknow-layout="canonical-layout-children-v2"` + `auth-card` (não `landing-v2` como único conteúdo).
3. Confirmar env Production: `AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
4. Aceitação real de email numa caixa de teste; só então declarar PASS de entrega.
5. **Rollback:** Instant Rollback no Vercel para o deployment Production anterior conhecido (anotar o URL `addynow-*-fc-private-driver.vercel.app` antes do promote).

## Este agente

- **Não** fez merge nem promote (restrição mantida).
- HEAD confirmado: `7dc2ef4` na branch `cursor/canonical-stable-ec69`.
- Sem `VERCEL_TOKEN` / `RESEND_API_KEY` no ambiente do agente.
