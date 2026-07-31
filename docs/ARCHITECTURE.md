# Arquitetura — FC Private Driver

## Modelo de negócio

Subscrição mensal com saldo de minutos. O cliente marca viagens; a FC Private Driver confirma e atribui motorista. Os minutos descontam-se apenas após conclusão, ao minuto (mínimo configurável). Minutos estimados de viagens futuras confirmadas ficam **reservados**.

## Domínios

| Domínio | Responsabilidade |
|---------|------------------|
| Auth | Registo, hash bcrypt, confirmação de e-mail, Auth.js JWT, roles CUSTOMER/DRIVER/ADMIN |
| Planos | `Plan`, `ExtraMinutePackage`, `SiteSettings` editáveis no admin |
| Subscrições | Ativação só via webhook Stripe / confirmação de pagamento (nunca só pelo redirect do browser) |
| Minutos | `MinuteTransaction` ledger — nunca alterar saldo sem movimento |
| Viagens | Pedido → aguardar confirmação → estados até conclusão + `TripTimer` |
| Notificações | IN_APP + EMAIL (WhatsApp/SMS preparados, sem envio automático) |
| Admin | Clientes, planos, viagens, motoristas, pagamentos, configurações, audit log |

## Fluxo de pagamento

1. Cliente escolhe plano → `Subscription` PENDING_PAYMENT + `Payment` PENDING  
2. Stripe Checkout (ou demo Multibanco/MB WAY/CARD)  
3. Webhook `checkout.session.completed` → `activateSubscriptionFromPayment`  
4. Ledger `PLAN_RENEWAL` + notificação

## Contabilização de tempo

- Início: motorista inicia / cliente entra / tolerância expirada (confirmada)  
- Fim: destino ou fim de espera  
- Espera conta; deslocação do motorista até ao cliente não conta  
- Portagens/estacionamento = `ExtraCharge` em dinheiro, não em minutos

## PWA

`manifest.webmanifest` + `sw.js` + meta Apple — instalável no ecrã principal.
