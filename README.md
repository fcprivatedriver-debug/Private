# FC Private Driver

Serviço de motorista privado por subscrição mensal — Progressive Web App (PWA).

**Marca:** FC Private Driver  
**Contacto:** fcprivatedriver@gmail.com · +351 933 239 595  
**Idioma:** Português de Portugal (i18n preparado para inglês)

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (credenciais) · Prisma · PostgreSQL
- Stripe (Cartão / MB WAY / Multibanco via webhooks)
- Google Maps (autocomplete + rotas)
- PWA instalável (manifest + service worker)
- next-intl (`/pt`, `/en`)

## Arranque local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000/pt](http://localhost:3000/pt).

### Contas de demonstração (password: `fcpd1234`)

| E-mail | Perfil |
|--------|--------|
| `admin@fcprivatedriver.demo` | Administrador |
| `cliente@fcprivatedriver.demo` | Cliente (Plano Privado ativo) |
| `motorista@fcprivatedriver.demo` | Motorista |

## Planos iniciais

| Plano | Preço | Minutos |
|-------|-------|---------|
| Privado | 99 €/mês | 300 (≈ 5 h) |
| Privado Plus | 199 €/mês | 600 (≈ 10 h) |

Preços, minutos, tolerância (10 min), cobrança mínima (15 min) e contactos são editáveis em **Admin → Configurações / Planos** — sem alterar código.

## Variáveis de ambiente

Ver `.env.example`:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (Neon em produção) |
| `AUTH_SECRET` | Segredo Auth.js (32+ caracteres) |
| `NEXT_PUBLIC_APP_NAME` | `FC Private Driver` |
| `NEXT_PUBLIC_APP_URL` | URL pública |
| `PAYMENTS_ENABLED` | `true` para Stripe real |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe (cliente) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mails transacionais |
| `DEMO_MODE` | Banner de demonstração |

## Scripts

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:demo
npm run pr:proof -- --pr <N>
```

## Áreas da aplicação

- **Pública:** landing, planos, contacto, termos, privacidade
- **Cliente:** painel de minutos, marcar viagem, faturas, perfil, hábitos
- **Motorista:** viagens atribuídas, estados, temporizador, custos extra
- **Admin:** clientes, planos, viagens, motoristas, pagamentos, configurações

## Deploy (Vercel + Neon)

1. Ligar o repositório à Vercel
2. Adicionar PostgreSQL (Neon) e copiar `DATABASE_URL` / `DIRECT_URL`
3. Definir `AUTH_SECRET` e restantes variáveis
4. Configurar webhook Stripe → `/api/webhooks/stripe`
5. Deploy — `npm run build` corre migrate automaticamente

Ver também `docs/DEPLOY_VERCEL.md`.
