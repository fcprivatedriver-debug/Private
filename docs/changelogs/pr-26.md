# PR 26 — Mel: Assistente Pessoal Inteligente

## Changelog

Substituição completa do marketplace ZRIK pela **Mel**, uma assistente pessoal inteligente para Web e PWA (Android / iPhone), com arquitectura modular preparada para expansão.

## Novas funcionalidades

- **Autenticação** por e-mail e palavra-passe (registo + login)
- **Biometria / PIN** após o primeiro login (flags + UI em Definições; WebAuthn detectado)
- **Hoje** — dashboard do dia com agenda, tarefas e conversa com a Mel
- **Tarefas** — criar, concluir, prioridades e prazos
- **Calendário** — eventos da semana
- **Captura por voz e texto** — Web Speech API + parser em português → tarefa / evento / lembrete
- **Relatórios semanais** — métricas, destaques e histórico
- **PWA** — manifest, service worker, ícones, instalável
- **Módulos** — registo central; hábitos e lembretes estruturados (`coming_soon`)

## Contas demo

| Email | Palavra-passe |
|-------|---------------|
| `filipe@mel.app` | `mel123` |
| `mel@mel.app` | `mel123` |

## Prova visual

- Screenshots: `docs/pr-proof/pr-26/screenshots-phone/`
- Fluxo: `docs/pr-proof/pr-26/flow-phone.gif`
- ZIP: `docs/pr-proof/pr-26/mel-pr-26-visual-proof.zip`
