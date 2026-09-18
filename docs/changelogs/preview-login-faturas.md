# Preview unificado — Login + Faturas

## Changelog
- **Login / Entrar**: restaura `src/app/[locale]/layout.tsx` com providers + `{children}` (corrige Production `0079b05` onde `/pt/login` SSR mostrava a landing).
- **Landing**: remove cartões com saldos/despesas/poupança fictícios; mantém design `landing-v2` e CTAs.
- **Faturas** (de #52): captura câmara/galeria/PDF, StoredObject Neon, OCR sem valores inventados, `?receipt=` em Nova despesa.

## Novas capacidades / correções
- `/pt` → **Entrar** → `/pt/login` com formulário email/password visível
- Login → `/pt/dashboard`
- Fotografar/enviar fatura sem OCR fictício

## Produção actual (não alterada por este Preview)
- `Production – addynow` @ `0079b05` — layout partido (Entrar não abre login)

## Prova visual
- `docs/pr-proof/preview-login-faturas/01-landing.png`
- `docs/pr-proof/preview-login-faturas/02-login-form.png`
- `docs/pr-proof/preview-login-faturas/03-dashboard.png`
- `docs/pr-proof/preview-login-faturas/04-ocr-faturas.png`
- `docs/pr-proof/preview-login-faturas/05-captura-foto.png`
- `docs/pr-proof/preview-login-faturas/preview-login-faturas-flow.mp4`
- Artefactos: `/opt/cursor/artifacts/screenshots/preview-login-faturas/` e `/opt/cursor/artifacts/preview-login-faturas-flow.mp4`

## Relação com outros PRs
- Inclui a correção de #51 (layout)
- Inclui as correções de #52 (faturas)
- **Sem merge para main / sem Production** neste passo — só Preview
