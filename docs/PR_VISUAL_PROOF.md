# PR visual proof (required)

After **every** pull request, before considering the work finished, generate and attach:

1. **Changelog** — plain-language summary of what changed
2. **New features** — bullet list of user-facing capabilities
3. **Screenshots** — every new or materially changed screen
4. **Short video or GIF** — complete primary flow (login → key actions)

Never finish a PR without this visual proof.

## Standard locations

| Artifact | Path |
|----------|------|
| Changelog + features | `docs/changelogs/pr-<N>.md` |
| Screenshots | `/opt/cursor/artifacts/screenshots/pr-<N>/` |
| Flow video | `/opt/cursor/artifacts/pr-<N>-flow.webm` (or `.mp4`) |
| Flow GIF | `/opt/cursor/artifacts/pr-<N>-flow.gif` |

## Capture helper

With the app running on `:3000` and demo data seeded:

```bash
npm run db:demo
npm run build && npm run start -- -p 3000
node scripts/pr-visual-proof.mjs --pr 8
```

Then update the PR body with:

- changelog + feature list from `docs/changelogs/pr-<N>.md`
- `<img>` tags for each screenshot (absolute artifact paths)
- `<video>` or `<img>` for the flow recording/GIF

## Roles to cover (Movio)

At minimum for marketplace PRs:

- **Customer:** login → pedidos → trip detail/offers → novo pedido
- **Driver:** painel → pedidos abertos → propostas → viagens → veículo
- **Admin:** admin metrics → verificações → vehicle classes
