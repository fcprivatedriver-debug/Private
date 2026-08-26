# Agent notes — FC Private Driver (marketing site)

Website de apresentação e contacto. Sem autenticação, planos, Stripe ou Maps.

## PR completion gate

Após cada PR, gerar provas visuais:

```bash
npm run build && npm run start -- -p 3000
npm run pr:proof
```

Embed artifacts under `/opt/cursor/artifacts/…`.
