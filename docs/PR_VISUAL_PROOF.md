# PR visual proof (required)

After **every** pull request, before considering the work finished, generate and attach:

1. **Changelog** — plain-language summary of what changed
2. **New features** — bullet list of user-facing capabilities
3. **Screenshots** — every new or materially changed screen
4. **Short video or GIF** — complete primary flow (login → key actions)

**Publish shareable assets to GitHub** under `docs/pr-proof/pr-<N>/` (ZIP + phone-optimized images).

## Standard locations (in repo)

| Artifact | Path |
|----------|------|
| Changelog + features | `docs/changelogs/pr-<N>.md` |
| Phone-ready ZIP | `docs/pr-proof/pr-<N>/mel-pr-<N>-visual-proof.zip` |
| Screenshots (JPG) | `docs/pr-proof/pr-<N>/screenshots-phone/` |
| Flow GIF | `docs/pr-proof/pr-<N>/flow-phone.gif` |

## Capture + publish

```bash
npm run db:demo
npm run build && npm run start -- -p 3000
npm run pr:proof -- --pr <N>
```

## Flows to cover (Mel)

- **Landing** → login / registo
- **Hoje** (dashboard + conversa)
- **Captura** por voz/texto
- **Tarefas** · **Calendário** · **Relatórios**
- **Definições** (biometria)
