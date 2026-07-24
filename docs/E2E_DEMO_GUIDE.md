# Guia E2E — ZRIK (modo demonstração / Sandbox)

Objetivo: validar o fluxo completo **como em produção**, sem desenvolver novas funcionalidades nem alterar o design.

Ambiente de referência: produção Vercel (ou local com Neon).  
Caixa de emails demo: `/pt/demo/emails`  
Guia in-app: `/pt/demo-e2e`

## Contas demo (já verificadas)

| Papel      | Email                 | Password  |
|-----------|------------------------|-----------|
| Cliente   | `cliente@movio.app`    | `movio123` |
| Motorista | `motorista@movio.app`  | `movio123` |
| Admin     | `admin@movio.app`      | `movio123` |

Contas **novas** ficam pendentes até o email ser confirmado (botão **ATIVAR CONTA**).

## Emails

Todos os emails transacionais são gravados em `EmailLog` e visíveis em `/pt/demo/emails`.

Opcional: defina `RESEND_API_KEY` e `EMAIL_FROM` para entrega real. Sem chave, o canal é `demo` (só mailbox).

Templates: verificação, conta ativada, pedido criado, nova proposta, proposta aceite, pagamento confirmado, viagem iniciada, viagem concluída, motorista aprovado.

## Pagamentos Sandbox

Com `PAYMENTS_ENABLED=false` (padrão):

- Checkout mostra cartão de teste e **Confirmar pagamento (Sandbox)**.
- Nenhum dinheiro real é movimentado.
- Reserva passa a `PAID` e a viagem a `CONFIRMED`.

Para Stripe Test / Live (ex.: €1):

```
PAYMENTS_ENABLED=true
STRIPE_SECRET_KEY=sk_test_…   # ou sk_live_…
```

## Passo a passo

### 1. Registo de cliente + verificação

1. Abrir `/pt/registo` → «Quero viajar».
2. Nome, email novo, palavra-passe (≥6).
3. Sem auto-login: ecrã «Verifique o email».
4. Abrir `/pt/demo/emails` → email «Ative a sua conta ZRIK» → **ATIVAR CONTA**.
5. Conta fica ativa; email «Conta ZRIK ativada».
6. Entrar em `/pt/login`.

### 2. Registo de motorista (demo)

1. Janela anónima → `/pt/registo?role=DRIVER`.
2. Ativar email (igual ao passo 1).
3. Completar onboarding + upload de documentos (modo demo).
4. Login admin → `/pt/admin/verificacoes` → aprovar.
5. Email «Motorista aprovado».

Atalho: usar `motorista@movio.app` já aprovado.

### 3–4. Publicar viagem

1. Cliente → `/pt/pedidos/novo` → publicar.
2. Email «Pedido de viagem criado».
3. Motorista → `/pt/pedidos-abertos` vê o pedido.

### 5–6. Proposta e escolha

1. Motorista envia proposta com preço.
2. Cliente recebe email «Nova proposta» → aceita.
3. Motorista recebe «Proposta aceite»; checkout abre.

### 7. Pagamento Sandbox

1. Em `/pt/pedidos/[id]/pagamento` → **Confirmar pagamento (Sandbox)**.
2. Emails de pagamento confirmado (cliente + motorista).
3. Estados: booking `PAID`, trip `CONFIRMED`.

### 8–9. Simular viagem

Na página da viagem, avançar:

1. Aguarda motorista (`CONFIRMED`)
2. Motorista a caminho (`DRIVER_EN_ROUTE`)
3. Motorista chegou (`DRIVER_ARRIVED`)
4. Viagem iniciada (`IN_PROGRESS`) → email
5. Viagem concluída (`COMPLETED`) → email

### 10. Fecho

- Recibo / confirmação: `/pt/pedidos/[id]/confirmacao`
- Histórico cliente: `/pt/pedidos`
- Histórico motorista: `/pt/viagens`
- Todos os emails: `/pt/demo/emails`

## Variáveis úteis

```
PAYMENTS_ENABLED=false
DEMO_MODE=true
RESEND_API_KEY=          # opcional
EMAIL_FROM="ZRIK <onboarding@resend.dev>"
NEXTAUTH_URL=https://seu-dominio
```

## Checklist rápido

- [ ] Conta nova não faz login antes de ATIVAR CONTA  
- [ ] ATIVAR CONTA ativa a conta  
- [ ] Motorista aprovado pelo admin (ou conta seed)  
- [ ] Pedido → proposta → aceitar → pagamento sandbox  
- [ ] Estados da viagem até COMPLETED  
- [ ] Emails na caixa demo  
- [ ] Recibo + históricos  
