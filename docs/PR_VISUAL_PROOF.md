# PR visual proof (required)

After **every** pull request, before considering the work finished, generate and attach:

1. **Changelog** — plain-language summary of what changed
2. **New features** — bullet list of user-facing capabilities
3. **Screenshots** — every new or materially changed screen
4. **Short video or GIF** — complete primary flow (login → key actions)

**Publish shareable assets** under `docs/pr-proof/pr-<N>/`.  
Also keep Cursor artifacts under `/opt/cursor/artifacts/…` for the PR body.

## Capture

```bash
npm run db:demo
npm run build && npm run start -- -p 3000
npm run pr:proof -- --pr <N>
```

## Roles / flows to cover (MAFIL)

- Landing → login → dashboard
- Receitas / despesas / orçamentos / objetivos
- Estatísticas, pesquisa, OCR, importações, IA, família, alertas, definições
- Mobile dashboard
