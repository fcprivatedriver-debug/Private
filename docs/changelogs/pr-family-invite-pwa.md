# Changelog — Convites familiares + PWA install

## Convites por email

- Email de convite com texto «X convidou-te para a família Y» + botão Aceitar.
- Links via `appBaseUrl()` (nunca localhost em Preview/Production).
- Se Resend falhar / `RESEND_API_KEY` ausente: **não** afirma «Convite enviado»; convite fica na BD + link para partilha manual.
- Logs seguros com `providerMessageId` do Resend (nunca a API key).

## PWA «Instalar aplicação»

- Persistência `localStorage` (`addyknow-pwa-install-v1`).
- Cooldown 7 dias após «Agora não».
- Nunca mostrar em `display-mode: standalone` / app instalada.
- Navegação SPA não reabre o prompt.

## Mensagens

Análise apenas (sem fornecedor pago): ver entrega do agente.
