# Deploy Vercel + Neon — FC Private Driver

1. Importar o repositório na Vercel.
2. Storage → criar Neon Postgres; mapear `DATABASE_URL` e `DIRECT_URL` (ou `DATABASE_URL_UNPOOLED`).
3. Environment variables:
   - `AUTH_SECRET` (obrigatório)
   - `AUTH_TRUST_HOST=true`
   - `NEXT_PUBLIC_APP_NAME=FC Private Driver`
   - `NEXT_PUBLIC_APP_URL=https://<seu-dominio>`
   - `DEMO_MODE=true` (desligar em produção real)
   - Opcional: Stripe, Google Maps, Resend
4. Build command: `npm run build` (já corre `prisma migrate deploy`).
5. Após o primeiro deploy: `vercel env` + se necessário `npx prisma db seed` via pipeline ou one-off.
6. Stripe webhook: `https://<dominio>/api/webhooks/stripe` → eventos `checkout.session.completed`.

## Contas demo

Password `fcpd123`:
- admin@fcprivatedriver.demo
- cliente@fcprivatedriver.demo
- motorista@fcprivatedriver.demo
