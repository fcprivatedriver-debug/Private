# Agent notes — Hegos

## PR completion gate (mandatory)

After every Pull Request, **before finishing**, automatically generate and attach:

1. Changelog (`docs/changelogs/pr-<N>.md`)
2. List of new features (same file)
3. Screenshots of every new/changed screen
4. Short video or GIF of the complete flow

Never mark a PR complete without this visual proof. See `docs/PR_VISUAL_PROOF.md`.

```bash
npm run db:demo
npm run build && npm run start -- -p 3000
npm i -D playwright@1.61.1
npx playwright install chromium
npm run pr:proof -- --pr <N>
```

Embed artifacts in the PR body with absolute paths under `/opt/cursor/artifacts/…`.
