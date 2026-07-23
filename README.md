# Movio

Marketplace de motoristas privados — os clientes publicam pedidos de viagem, os motoristas enviam propostas, o cliente escolhe a melhor.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite (dev; PostgreSQL em produção)
- Auth.js (NextAuth v5)
- Tailwind CSS
- Pagamentos preparados (Stripe Connect stub)

## Arranque

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Contas demo (password: `movio123`)

| Email | Role |
|-------|------|
| `cliente@movio.app` | Cliente |
| `motorista@movio.app` | Motorista (ativo) |
| `motorista2@movio.app` | Motorista (ativo) |
| `pendente@movio.app` | Motorista (em verificação) |
| `admin@movio.app` | Admin |

## Documentação

- [Plano de arquitetura](./docs/ARCHITECTURE.md)

## Defaults de produto

- Moeda: EUR
- Comissão Movio: 15%
- Contactos revelados após aceite da proposta
- Role única por conta no MVP
- UI em português
- `PAYMENTS_ENABLED=false` (confirmação demo sem Stripe)
