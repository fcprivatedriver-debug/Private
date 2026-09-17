# Changelog — ronda pós-auditoria addYknow

## Segurança
- `canEditFinances` em budgets, goals, recurring, categories, savings pots
- Middleware: rotas `/mobilidade`, `/calendario`, `/guia`, `/transacoes`, `/personalizar`, `/privacidade-dados`
- `/api/health` mínimo (sem contagens/config)

## TESTER
- Modelo `ProductAccess` (separado de FamilyRole)
- Admin grant/revoke via `PRODUCT_ACCESS_ADMIN_KEY`

## MEL
- `tool_choice: required` em perguntas financeiras
- Aliases `askMel`, `answerMel`, `MelChat`
- Cookies `mel_space` (+ legado `nina_space`)

## Honestidade de dados
- OCR fictício (2487) desactivado
- Combustível/EV/supermercados: providers sem mocks; "Informação indisponível"
- Auchan na arquitectura
- Calendário: sem slots inventados
- GPS helper real (sem Lisboa falsa)
- Navegação respeita preferência Waze/Google/Apple nos engines

## Persistência UX
- Feedback «A guardar…» / «Guardado» em receitas e despesas
