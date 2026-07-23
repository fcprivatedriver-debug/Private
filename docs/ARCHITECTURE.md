# FC Private Driver — Arquitetura

## Visão

Marketplace de motoristas privados (modelo GetTransfer) com três papéis:

| Papel | Descrição |
|-------|-----------|
| **Cliente** | Cria pedidos de viagem, recebe propostas, escolhe motorista, avalia |
| **Motorista** | Gere veículos, envia propostas, executa viagens, consulta ganhos |
| **Administrador** | Gere utilizadores, motoristas, viagens, comissões e definições |

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** — design system via CSS variables
- **Zod** — schemas de validação partilhados
- **lucide-react** — iconografia

## Árvore de pastas

```
src/
├── app/
│   ├── (marketing)/          # Site público
│   ├── (auth)/               # Login, registo, recuperação
│   ├── (client)/cliente/     # Painel do cliente
│   ├── (driver)/motorista/   # Painel do motorista
│   ├── (admin)/admin/        # Painel de administração
│   └── api/                  # Route handlers (health, futuros endpoints)
├── components/
│   ├── ui/                   # Primitivos (Button, Input, Card, …)
│   ├── layout/               # Shells, Header, Sidebar, Footer
│   ├── auth/                 # Formulários de autenticação
│   ├── marketing/            # Secções do site
│   ├── trips/                # Pedidos / viagens
│   ├── proposals/            # Propostas
│   ├── vehicles/             # Veículos
│   ├── reviews/              # Avaliações
│   ├── notifications/        # Notificações
│   └── shared/               # EmptyState, PageHeader, StatusBadge
├── config/                   # Site, navegação, papéis, comissões
├── types/                    # Domínio tipado
├── lib/
│   ├── utils/                # cn, formatters
│   ├── validations/          # Schemas Zod
│   ├── constants/            # Enums / labels
│   └── payments/             # Contrato preparado para gateway
└── hooks/                    # Hooks reutilizáveis
```

## Fluxo de negócio (preparado)

```
Cliente cria pedido → Motoristas enviam propostas → Cliente aceita
→ Viagem confirmada → Execução → Pagamento (futuro) → Avaliação
→ Comissão da plataforma registada
```

## Camadas futuras (sem implementação prematura)

1. **Auth** — NextAuth / Auth.js ou Clerk (adapters em `lib/auth`)
2. **DB** — Prisma / Drizzle (`lib/db`)
3. **Pagamentos** — Stripe / MB Way via `lib/payments`
4. **Realtime** — notificações (SSE / WebSocket)

## Convenções

- Rotas e UI em **português**
- Código e identificadores em **inglês**
- Componentes de domínio em pastas por feature
- Navegação centralizada em `config/navigation.ts`
- Tipos de domínio em `types/` — fonte de verdade TypeScript
