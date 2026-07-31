# FC Private Driver — PR 34

## Changelog

- Nova plataforma **FC Private Driver** (PWA) independente do marketplace anterior
- Modelo de negócio: subscrição mensal com saldo de minutos
- Landing page pública com planos, vantagens, contactos e WhatsApp
- Registo, login, confirmação de e-mail e recuperação de palavra-passe
- Perfil completo + hábitos de deslocação
- Área do cliente com plano, minutos (incluídos/utilizados/reservados/disponíveis), viagens e faturas
- Pedido e agendamento de viagens (estado inicial «A aguardar confirmação»)
- Área do motorista com estados de serviço e temporizador
- Painel de administração (clientes, planos, viagens, motoristas, pagamentos, configurações)
- Ledger de minutos (nunca altera saldo sem movimento)
- Stripe + webhooks (ativação só após confirmação); Multibanco/MB WAY em modo demo
- PWA instalável (manifest + service worker)
- Dados de demonstração e testes Vitest
- **Quatro níveis de adesão premium** com cartões de cor distinta (Bronze / Prata / Ouro / Diamante)
- Formulário de proposta Diamante com persistência, e-mails e registo no admin
- Secção admin **Clientes Diamante** com pipeline de estados e conversão em plano personalizado
- **Confirmação de e-mail automática** no registo (token 24h, e-mail de ativação, página de sucesso, reenvio e gestão no admin)

## Novas funcionalidades

### Planos de subscrição

| Nível | Preço | Minutos | CTA |
|-------|-------|---------|-----|
| 🟤 Bronze | 59 € / mês | 120 | Aderir ao Bronze |
| ⚪ Prata | 119 € / mês | 300 | Aderir ao Prata |
| 🟡 Ouro | 199 € / mês | 600 | Aderir ao Ouro |
| 💎 Diamante | Proposta Personalizada | — | Solicitar Proposta |

- Cartões com tipografia e cores por nível (sem preço no Diamante)
- Diamante destinado a empresas, hotéis, ALs, clínicas, escritórios, famílias e necessidades específicas
- Planos e pacotes editáveis no admin (incluindo personalizados) sem alterar código

### Fluxo Diamante

- Formulário: nome, empresa (opcional), e-mail, telefone, utilizadores estimados, viagens/semana, horários, zona, observações
- Após submissão: grava na BD, confirmação ao cliente, cópia para `fcprivatedriver@gmail.com`, notificação in-app aos admins
- Admin → **Clientes Diamante** com estados: Recebido, Em análise, Contactado, Proposta enviada, Aceite, Rejeitado
- Proposta aceite → conversão em subscrição personalizada (valor mensal, minutos, condições especiais, renovação, notas internas)

### Confirmação de e-mail

- Registo cria conta com `emailVerified = null` / `PENDING_EMAIL` e token seguro (24h)
- Envio automático de `FC Private Driver <fcprivatedriver@gmail.com>` com assunto «Bem-vindo à FC Private Driver — Ative a sua conta»
- `/ativar?token=…` valida, ativa a conta, apaga o token e mostra mensagem de sucesso
- Token expirado/inválido → botão **Reenviar e-mail de ativação**
- Admin → Clientes: estado de confirmação, data e reenvio manual
- Falha de envio: aviso ao utilizador, registo em `AdminAuditLog`, reenvio disponível

### Restantes

- Compra de minutos adicionais (30 / 60 / 120) com preços configuráveis
- Contabilização ao minuto, mínimo 15 min, tolerância 10 min (editáveis)
- Notificações in-app + e-mail
- RGPD: exportação de dados e pedido de eliminação de conta
- i18n PT (default) com preparação EN

## Provas visuais

- Screenshots: `docs/pr-proof/pr-34/screenshots-phone/`
- Fluxo: `docs/pr-proof/pr-34/flow-phone.gif`
- ZIP: `docs/pr-proof/pr-34/fc-private-driver-pr-34-visual-proof.zip`

## Credenciais demo

Password: `fcpd123`

| Perfil | E-mail |
|--------|--------|
| Admin | admin@fcprivatedriver.demo |
| Cliente | cliente@fcprivatedriver.demo |
| Motorista | motorista@fcprivatedriver.demo |

## Como alterar planos, preços e contactos

1. Entrar como admin
2. **Admin → Planos** — preços, minutos, tier, cor, CTA, condições especiais, pacotes extra
3. **Admin → Clientes Diamante** — pipeline de propostas e conversão em plano personalizado
4. **Admin → Configurações** — e-mail, telefone, WhatsApp, tolerância, cobrança mínima, textos do site, termos e privacidade
