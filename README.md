# FC Private Driver

Marketplace profissional de motoristas privados — Next.js 15, TypeScript e Tailwind CSS.

## Arranque

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |

## Estrutura

Ver [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) para o plano completo de pastas, papéis e fluxos.

### Áreas principais

- **Marketing** — `/`, `/como-funciona`, `/para-motoristas`, `/contactos`
- **Auth** — `/login`, `/registo`, `/recuperar-palavra-passe`, `/redefinir-palavra-passe`
- **Cliente** — `/cliente/*`
- **Motorista** — `/motorista/*`
- **Admin** — `/admin/*`
- **API** — `/api/health`

## Próximos passos sugeridos

1. Autenticação (Auth.js / Clerk) + middleware por papel
2. Base de dados (Prisma/Drizzle) alinhada com `src/types`
3. API routes / Server Actions para viagens e propostas
4. Adapter de pagamentos em `src/lib/payments`
5. Notificações em tempo real

## Variáveis de ambiente

Copiar `.env.example` para `.env.local` e preencher conforme necessário.
