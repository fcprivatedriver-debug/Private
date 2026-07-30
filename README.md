# ZELU

Marketplace de chauffeurs privados — os clientes publicam pedidos de viagem, os motoristas enviam propostas, o cliente escolhe a melhor.

**Excelência discreta. Sempre contigo.**

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

### Contas demo (password: `zelu123`)

| Email | Role |
|-------|------|
| `cliente@zelu.app` | Cliente |
| `motorista@zelu.app` | Motorista (ativo) |
| `motorista2@zelu.app` | Motorista (ativo) |
| `pendente@zelu.app` | Motorista (em verificação) |
| `admin@zelu.app` | Admin |

## Documentação

- [Plano de arquitetura](./docs/ARCHITECTURE.md)

## Defaults de produto

- Moeda: EUR
- Comissão ZELU: 15%
- Contactos revelados após aceite da proposta
- Role única por conta no MVP
- UI em português
- `PAYMENTS_ENABLED=false` (confirmação demo sem Stripe)

## Identidade

- Nome: **ZELU**
- Accent: Forest teal `#1F4F46`
- Tipografia: Sora (display) + Plus Jakarta Sans (body)
- Marca: monograma **Z** (ícone / favicon)
- Slogan: Excelência discreta. Sempre contigo.
- Valores: Excelência · Profissionalismo · Responsabilidade · Educação · Disponibilidade · Empatia · Discrição
