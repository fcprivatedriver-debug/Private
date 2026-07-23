# Movio — Plano de Arquitetura

> Marketplace de motoristas privados (modelo GetTransfer).  
> **Estado:** proposta — aguarda aprovação antes da implementação.

---

## 1. Visão do produto

A **Movio** liga clientes que precisam de transporte privado a motoristas que enviam propostas.

**Fluxo nuclear**

1. Cliente publica um pedido de viagem (origem, destino, data/hora, passageiros, bagagem, notas).
2. Motoristas (ou frotas) veem o pedido e enviam propostas com preço e condições.
3. Cliente compara propostas e escolhe uma.
4. Reserva fica confirmada; pagamento é preparado para integração futura (escrow / captura na confirmação).
5. Viagem decorre; cliente pode avaliar o motorista.

---

## 2. Tecnologias

| Camada | Escolha | Motivo |
|--------|---------|--------|
| Framework | **Next.js 15** (App Router) + **TypeScript** | Full-stack, SSR/SEO, API routes / Route Handlers |
| UI | **Tailwind CSS** + componentes próprios | Controlo total do design; sem dependência pesada de UI kits genéricos |
| ORM / DB | **Prisma** + **PostgreSQL** | Tipagem forte, migrações, bom para marketplace |
| Auth | **Auth.js (NextAuth v5)** com Credentials + OAuth (Google) | Sessões JWT/DB, roles, extensível |
| Validação | **Zod** | Schemas partilhados entre API e formulários |
| Estado servidor | React Server Components + Server Actions | Menos boilerplate; mutações tipadas |
| Uploads | **Uploadthing** ou S3-compatible (presigned URLs) | Documentos do motorista, fotos do veículo |
| Email | **Resend** (transacional) | Notificações de propostas, aceitação, lembretes |
| Pagamentos (futuro) | **Stripe Connect** (Express) | Marketplace: split cliente → plataforma → motorista |
| Mapas / geocoding | **Mapbox** ou Google Maps Places | Autocomplete de endereços, distâncias |
| Hosting | **Vercel** + **Neon/Supabase Postgres** (ou RDS) | Deploy simples; escalável depois |
| Monorepo? | **Não** (app única) | Greenfield; mono-app até haver necessidade real |

**Princípios**

- TypeScript strict em todo o projeto.
- Domínio e regras de negócio no servidor (nunca confiar só no cliente).
- APIs REST-ish via Route Handlers; Server Actions para formulários da própria app.
- Feature flags / stubs para pagamentos até haver Stripe.

---

## 3. Tipos de utilizador (roles)

| Role | Descrição | Capacidades principais |
|------|-----------|------------------------|
| `CUSTOMER` | Cliente que pede viagens | Criar/editar pedidos, ver propostas, aceitar, cancelar, avaliar |
| `DRIVER` | Motorista independente | Perfil + veículo, ver pedidos abertos, enviar/atualizar propostas, gerir agenda |
| `FLEET` *(fase 2)* | Gestor de frota | Mesmo que driver + gerir vários motoristas/veículos |
| `ADMIN` | Operações Movio | Moderar pedidos/propostas, verificar KYC motoristas, suporte, métricas |

Um utilizador tem **uma** role primária no MVP. Contas dual (cliente + motorista) ficam para fase 2 (mesmo email, profiles separados ou role switch).

### Estados do motorista

- `PENDING_VERIFICATION` — registo incompleto / docs em análise  
- `ACTIVE` — pode propor  
- `SUSPENDED` — bloqueado pela admin  
- `REJECTED` — verificação recusada  

---

## 4. Estrutura de pastas

```
movio/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── brand/                 # logo, favicon
│   └── images/
├── src/
│   ├── app/
│   │   ├── (marketing)/       # landing, como funciona, preços
│   │   │   ├── page.tsx
│   │   │   ├── como-funciona/
│   │   │   └── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── registo/
│   │   │   └── layout.tsx
│   │   ├── (customer)/
│   │   │   ├── pedidos/
│   │   │   │   ├── novo/
│   │   │   │   └── [id]/
│   │   │   └── layout.tsx     # guard CUSTOMER
│   │   ├── (driver)/
│   │   │   ├── painel/
│   │   │   ├── pedidos/       # marketplace de pedidos abertos
│   │   │   ├── propostas/
│   │   │   ├── veiculo/
│   │   │   └── layout.tsx     # guard DRIVER
│   │   ├── (admin)/
│   │   │   ├── dashboard/
│   │   │   ├── verificacoes/
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── trips/
│   │   │   ├── offers/
│   │   │   ├── users/
│   │   │   ├── payments/      # stubs / webhooks futuros
│   │   │   └── webhooks/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # botões, inputs, dialogs
│   │   ├── trip/              # formulário pedido, card, timeline
│   │   ├── offer/             # card proposta, formulário bid
│   │   ├── map/
│   │   └── layout/            # header, footer, shells
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts              # Prisma client
│   │   ├── money.ts           # centavos, moedas
│   │   ├── payments/          # interface + Stripe stub
│   │   ├── email/
│   │   ├── maps/
│   │   └── utils.ts
│   ├── domain/
│   │   ├── trip/              # regras: estados, cancelamento
│   │   ├── offer/             # regras: validade, aceitação
│   │   └── user/
│   ├── actions/               # Server Actions
│   ├── types/
│   └── config/
│       ├── env.ts             # validação env com Zod
│       └── constants.ts
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

**Camada `domain/`** concentra regras (ex.: “só se pode aceitar proposta se o pedido está `OPEN`”), isolada de UI e de HTTP.

---

## 5. Base de dados (modelo conceptual)

### Entidades principais

```
User
  id, email, passwordHash?, name, phone, role, locale, createdAt
  customerProfile? | driverProfile?

CustomerProfile
  userId, defaultCurrency, ratingAvg?

DriverProfile
  userId, status, bio, languages[], ratingAvg, ratingCount
  documents[], verifiedAt?

Vehicle
  id, driverId, make, model, year, color, plate, seats, luggageCapacity
  category (SEDAN | EXECUTIVE | VAN | MINIBUS | LUXURY)
  photoUrls[]

TripRequest (pedido)
  id, customerId
  pickupAddress, pickupLat, pickupLng
  dropoffAddress, dropoffLat, dropoffLng
  pickupAt (datetime)
  passengers, luggage
  notes, flightNumber?
  status: DRAFT | OPEN | OFFER_ACCEPTED | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED | EXPIRED
  preferredVehicleCategory?
  currency (default EUR)
  expiresAt
  acceptedOfferId?

Offer (proposta)
  id, tripRequestId, driverId, vehicleId?
  priceAmount (inteiro em cêntimos)
  currency
  message?
  includesTolls, includesWaiting?
  validUntil
  status: PENDING | WITHDRAWN | REJECTED | ACCEPTED | EXPIRED
  createdAt, updatedAt

Booking (reserva — criada ao aceitar oferta)
  id, tripRequestId, offerId, customerId, driverId
  status: PENDING_PAYMENT | PAID | REFUNDED | CANCELLED | COMPLETED
  totalAmount, currency, platformFeeAmount
  paymentIntentId?   # futuro Stripe
  confirmedAt?

Payment (preparado; pode começar stub)
  id, bookingId
  provider: STRIPE | MANUAL | NONE
  providerPaymentId?
  amount, currency, status: REQUIRES_PAYMENT | AUTHORIZED | CAPTURED | FAILED | REFUNDED
  rawPayload? (json)

Review
  id, bookingId, fromUserId, toUserId, rating (1-5), comment?, createdAt

Notification
  id, userId, type, title, body, readAt?, meta (json)

AuditLog (admin)
  id, actorId, action, entityType, entityId, meta, createdAt
```

### Índices importantes

- `TripRequest(status, pickupAt)` — listagem de pedidos abertos para motoristas  
- `Offer(tripRequestId, status)`  
- `Offer(driverId, status)`  
- Unique parcial: no máximo **uma** `Offer ACCEPTED` por `tripRequestId`  
- Unique: um `Booking` por `offerId` / por `tripRequestId` aceite  

### Dinheiro

- Guardar sempre **inteiros em cêntimos** (`priceAmount`).  
- Moeda ISO (`EUR`, `GBP`, …).  
- Nunca `float` para preços.

### Diagrama de estados — TripRequest

```
DRAFT → OPEN → OFFER_ACCEPTED → CONFIRMED → IN_PROGRESS → COMPLETED
                 ↓                    ↓
              CANCELLED            CANCELLED
OPEN → EXPIRED (sem aceitação até expiresAt)
```

### Diagrama de estados — Offer

```
PENDING → ACCEPTED | REJECTED | WITHDRAWN | EXPIRED
```

Ao aceitar uma oferta: as outras `PENDING` do mesmo pedido passam a `REJECTED` (ou `EXPIRED` conforme regra).

---

## 6. Fluxo da aplicação

### 6.1 Cliente

1. Registo / login como `CUSTOMER`.  
2. Cria pedido (`/pedidos/novo`) com endereços, data, passageiros.  
3. Publica → status `OPEN`; motoristas são notificados (email + in-app; push fase 2).  
4. Recebe propostas em tempo quase real (polling curto no MVP; WebSockets/SSE fase 2).  
5. Compara preço, veículo, mensagem do motorista.  
6. Aceita uma proposta → cria `Booking` + `Payment` em `REQUIRES_PAYMENT`.  
7. **MVP pagamentos:** marcar como “pagamento em preparação” / confirmação manual; UI mostra “Pagamento seguro em breve”.  
8. Após pagamento futuro (`CAPTURED`) → `CONFIRMED`.  
9. No dia da viagem: `IN_PROGRESS` → `COMPLETED` (motorista ou sistema).  
10. Cliente deixa review.

### 6.2 Motorista

1. Registo como `DRIVER` + dados do veículo + upload de docs.  
2. Admin verifica → `ACTIVE`.  
3. Vê lista de pedidos `OPEN` (filtros: data, zona, categoria).  
4. Envia proposta (preço, validade, veículo).  
5. Pode retirar enquanto `PENDING`.  
6. Se aceite: vê detalhes da reserva, contactos (regras de privacidade: revelar telefone só após confirmação).  
7. Marca início/fim da viagem.

### 6.3 Admin

1. Dashboard: pedidos abertos, propostas, conversão.  
2. Fila de verificação de motoristas.  
3. Cancelamentos / disputas (fase 2).  
4. Ajustes manuais de estado se necessário.

### 6.4 Cancelamentos (MVP)

- Cliente cancela `OPEN`: fecha pedido; propostas → `EXPIRED`.  
- Cliente cancela após aceite: regras simples (full refund se >24h; depois política stub).  
- Motorista cancela após aceite: pedido pode reabrir `OPEN` ou ir para suporte — **decisão MVP:** reabre `OPEN` e notifica cliente.

---

## 7. Páginas (rotas)

### Públicas / marketing

| Rota | Conteúdo |
|------|----------|
| `/` | Landing Movio — brand hero, CTA “Pedir viagem” / “Ser motorista” |
| `/como-funciona` | 3 passos (pedir → propostas → escolher) |
| `/para-motoristas` | Pitch motoristas |
| `/termos`, `/privacidade` | Legais |

### Auth

| Rota | Conteúdo |
|------|----------|
| `/login` | Email/password + Google |
| `/registo` | Escolha Cliente ou Motorista |
| `/registo/motorista` | Wizard perfil + veículo |

### Cliente (`CUSTOMER`)

| Rota | Conteúdo |
|------|----------|
| `/pedidos` | Lista dos meus pedidos |
| `/pedidos/novo` | Formulário de pedido |
| `/pedidos/[id]` | Detalhe + propostas + aceitar |
| `/conta` | Perfil |

### Motorista (`DRIVER`)

| Rota | Conteúdo |
|------|----------|
| `/painel` | Resumo: propostas ativas, próximas viagens |
| `/pedidos` (driver) | Marketplace de pedidos abertos |
| `/pedidos/[id]/proposta` | Criar/editar proposta |
| `/propostas` | Minhas propostas |
| `/viagens` | Reservas confirmadas |
| `/veiculo` | Gestão do veículo |
| `/conta` | Perfil + docs |

### Admin

| Rota | Conteúdo |
|------|----------|
| `/admin` | Dashboard |
| `/admin/verificacoes` | KYC motoristas |
| `/admin/pedidos` | Moderação |
| `/admin/utilizadores` | Gestão |

---

## 8. APIs

Convenção: `/api/...`, JSON, erros `{ error: { code, message } }`, auth via sessão.

### Auth

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| — | `/api/auth/[...nextauth]` | Auth.js |

### Trips (pedidos)

| Método | Endpoint | Quem | Descrição |
|--------|----------|------|-----------|
| `POST` | `/api/trips` | Customer | Criar pedido |
| `GET` | `/api/trips` | Customer: meus; Driver: abertos (`?scope=open`) | Listar |
| `GET` | `/api/trips/:id` | Owner / drivers elegíveis / admin | Detalhe |
| `PATCH` | `/api/trips/:id` | Customer (só `DRAFT`/`OPEN` limitado) | Atualizar |
| `POST` | `/api/trips/:id/publish` | Customer | `DRAFT` → `OPEN` |
| `POST` | `/api/trips/:id/cancel` | Customer / Admin | Cancelar |
| `POST` | `/api/trips/:id/accept-offer` | Customer | Aceitar oferta `{ offerId }` |

### Offers (propostas)

| Método | Endpoint | Quem | Descrição |
|--------|----------|------|-----------|
| `POST` | `/api/offers` | Driver `ACTIVE` | Criar proposta |
| `GET` | `/api/offers?tripId=` | Customer (do pedido) / Driver (suas) | Listar |
| `PATCH` | `/api/offers/:id` | Driver (só `PENDING`) | Atualizar preço/mensagem |
| `POST` | `/api/offers/:id/withdraw` | Driver | Retirar |

### Users / driver

| Método | Endpoint | Quem | Descrição |
|--------|----------|------|-----------|
| `GET` | `/api/me` | Auth | Perfil atual |
| `PATCH` | `/api/me` | Auth | Atualizar dados |
| `POST` | `/api/driver/vehicle` | Driver | Upsert veículo |
| `POST` | `/api/driver/documents` | Driver | Metadata upload |

### Bookings / payments (stubs)

| Método | Endpoint | Quem | Descrição |
|--------|----------|------|-----------|
| `GET` | `/api/bookings/:id` | Partes | Detalhe reserva |
| `POST` | `/api/payments/intent` | Customer | **Stub** — devolve `{ status: "not_configured" }` ou cria PaymentIntent quando Stripe existir |
| `POST` | `/api/webhooks/stripe` | Stripe | Webhook futuro |

### Admin

| Método | Endpoint | Quem | Descrição |
|--------|----------|------|-----------|
| `GET` | `/api/admin/drivers/pending` | Admin | Fila KYC |
| `POST` | `/api/admin/drivers/:id/verify` | Admin | Ativar/rejeitar |
| `GET` | `/api/admin/stats` | Admin | Métricas básicas |

Server Actions espelham as mutações usadas nos formulários da UI (criar pedido, aceitar oferta, etc.), chamando a mesma lógica em `domain/`.

---

## 9. Sistema de autenticação

### Stack

- **Auth.js (NextAuth v5)** com adapter Prisma.  
- Providers MVP: **Credentials** (email + password com bcrypt/argon2) + **Google OAuth**.  
- Sessão: **JWT** ou database session (preferência: database session para poder revogar).  
- Middleware Next.js protege grupos `(customer)`, `(driver)`, `(admin)` por `role`.

### Fluxo

1. Registo → cria `User` + profile (`CustomerProfile` ou `DriverProfile`).  
2. Email de verificação (Resend) — opcional no MVP técnico, recomendado antes de produção.  
3. Login → sessão com `{ userId, role }`.  
4. Guards:  
   - API e layouts verificam role + ownership do recurso.  
   - Driver só propõe se `DriverProfile.status === ACTIVE`.

### Segurança

- Rate limit em login e criação de propostas.  
- CSRF coberto por Server Actions / SameSite cookies.  
- Secrets só em env (`AUTH_SECRET`, `DATABASE_URL`, …).  
- Validação Zod em todos os inputs.  
- Não expor email/telefone do cliente aos motoristas até `Booking` confirmado (ou aceite — decisão de produto: **após aceite** no MVP).

---

## 10. Sistema de ofertas (propostas)

### Regras de negócio (MVP)

1. Só motoristas `ACTIVE` com pelo menos 1 veículo podem propor.  
2. Um motorista: **no máximo 1 proposta `PENDING` por pedido** (atualizar em vez de duplicar).  
3. Preço > 0; moeda = moeda do pedido.  
4. `validUntil` default: pickup − 2h ou `expiresAt` do pedido (o que for primeiro).  
5. Cliente vê propostas ordenadas por preço ascendente (filtro depois: rating, categoria).  
6. **Aceitar oferta** (transação DB):  
   - Lock do `TripRequest`.  
   - Verificar `OPEN` + oferta `PENDING` + não expirada.  
   - Oferta → `ACCEPTED`; restantes → `REJECTED`.  
   - Pedido → `OFFER_ACCEPTED`.  
   - Criar `Booking` (`PENDING_PAYMENT`) + `Payment` stub.  
7. Retirada pelo motorista só se `PENDING`.  
8. Job/cron (Vercel cron ou worker simples): expirar pedidos e propostas (`EXPIRED`).

### UX

- Card de proposta: preço total, veículo, rating motorista, mensagem, validade.  
- Cliente: CTA claro “Escolher esta proposta”.  
- Motorista: formulário curto (preço + mensagem opcional); veículo pré-selecionado.

---

## 11. Sistema de pagamentos (preparado, não integrado)

### Abstração

```ts
// lib/payments/types.ts
interface PaymentProvider {
  createPaymentIntent(input: CreateIntentInput): Promise<CreateIntentResult>
  capture(paymentId: string): Promise<void>
  refund(paymentId: string, amount?: number): Promise<void>
  parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>
}
```

Implementações:

1. **`NullPaymentProvider`** (MVP) — cria registo `Payment` com `provider: NONE`, status `REQUIRES_PAYMENT`; booking pode avançar com flag `PAYMENTS_ENABLED=false` (confirmação “manual” / confiança).  
2. **`StripeConnectProvider`** (futuro) — PaymentIntent com `application_fee_amount` + `transfer_data.destination` (conta Connect do motorista).

### Modelo de negócio (alvo)

- Cliente paga o valor da proposta.  
- Movio retém **commission %** (`platformFeeAmount`).  
- Motorista recebe o restante via Connect payout.  
- Captura: na aceitação (auth+capture) ou no início da viagem — **recomendação:** authorize na aceitação, capture 24h antes do pickup ou no confirm.

### O que se implementa já

- Tabelas `Booking` + `Payment`.  
- UI de checkout desativada / placeholder (“Pagamentos seguros em breve”).  
- Env `PAYMENTS_ENABLED=false`, `STRIPE_SECRET_KEY=` vazio.  
- Endpoint `/api/payments/intent` e webhook com early-return.  
- Cálculo de `platformFeeAmount` já persistido (ex. 15%) para não migrar depois.

### O que NÃO se faz no MVP

- Cobrança real, cartões, payouts, 3DS, disputas Stripe.

---

## 12. Notificações (MVP)

| Evento | Cliente | Motorista |
|--------|---------|-----------|
| Nova proposta | Email + in-app | — |
| Proposta aceite | Email | Email + in-app |
| Pedido cancelado | — | Email |
| Pedido expirado | Email | — |
| Motorista verificado | — | Email |

Tabela `Notification` + polling leve no header; email via Resend templates.

---

## 13. Fases de entrega

### Fase 0 — Fundação (após aprovação deste plano)

- Scaffold Next.js + Prisma + Auth + layout Movio  
- Models + seed (admin, customer demo, driver demo)  
- Landing + auth pages  

### Fase 1 — Core marketplace

- CRUD pedidos + listagem aberta motoristas  
- Sistema de ofertas + aceitação transacional  
- Painéis customer/driver  
- Stubs de pagamento + bookings  

### Fase 2 — Confiança e ops

- Verificação admin de motoristas/docs  
- Reviews  
- Cron de expiração  
- Mapas / autocomplete endereços  

### Fase 3 — Pagamentos reais

- Stripe Connect  
- Checkout + webhooks  
- Reembolsos básicos  

### Fase 4 — Escala

- Frota (`FLEET`), chat, push, multi-moeda avançada, i18n PT/EN completo  

---

## 14. Decisões em aberto (para aprovares)

1. **Nome do pacote/repo:** manter `Private` no GitHub e só brand “Movio” na app, ou renomear tudo para `movio`?  
2. **Moeda default:** `EUR`?  
3. **Commission default:** 15%?  
4. **Contactos:** revelar telefone do cliente ao motorista no **aceite** ou só após **pagamento**?  
5. **Contas dual** (mesmo user ser cliente e motorista): MVP só role única, ok?  
6. **Mapas:** Mapbox vs Google — preferência / chave disponível?  
7. **Idioma UI:** só PT no MVP, ou PT+EN desde o início?

---

## 15. Critérios de sucesso do MVP

- Cliente cria pedido e recebe ≥1 proposta (fluxo demo com seed).  
- Cliente aceita proposta e vê reserva criada.  
- Motorista vê estado “aceite” e detalhes da viagem.  
- Pagamento claramente stubbed, schema pronto para Stripe.  
- Roles isolados por middleware; sem vazamento de dados entre users.  
- Brand **Movio** consistente na landing e na app.

---

*Documento de arquitetura — Movio. Aguardar aprovação explícita antes de implementar código de aplicação.*
