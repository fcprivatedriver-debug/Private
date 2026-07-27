# Mel — Assistente Pessoal Inteligente

> Organiza a vida por voz e texto: tarefas, calendário, hábitos, lembretes e relatórios.  
> **Brand:** Mel · **Locale:** Português (Portugal) · **Plataformas:** Web + PWA (Android / iPhone)

---

## Decisões de produto

| Decisão | Escolha |
|----------|---------|
| Marca | **Mel** |
| Idioma | Português de Portugal (`/pt`), Inglês disponível |
| Auth | E-mail + palavra-passe; biometria após o 1.º login |
| Captura | Voz (Web Speech) + texto |
| Arquitectura | Modular — cada capacidade é um módulo independente |
| MVP | Tarefas · Calendário · Captura por voz · Relatórios semanais |
| Preparado | Hábitos · Lembretes · futuros módulos sem acoplamento rígido |

---

## Stack

| Camada | Escolha |
|--------|---------|
| App | Next.js 15 App Router + TypeScript |
| UI | Tailwind v4 + design tokens Mel |
| DB | Prisma + PostgreSQL (Neon em prod) |
| Auth | Auth.js (credentials) + flags biométricas |
| Validação | Zod |
| i18n | next-intl |
| Mobile | PWA instalável (standalone) |

---

## Estrutura modular

```
src/
├── modules/
│   ├── registry.ts          # catálogo de módulos + feature flags
│   ├── tasks/               # domínio + serviço de tarefas
│   ├── calendar/            # eventos e agenda
│   ├── voice/               # captura NL → intent → acção
│   ├── reports/             # relatórios semanais
│   ├── habits/              # estrutura pronta (ainda stub)
│   └── reminders/           # estrutura pronta (ainda stub)
├── lib/
│   ├── auth.ts
│   ├── db.ts                # schema `mel` em Neon partilhado
│   └── ai/mel-assistant.ts  # conversa heurística PT
├── components/
│   ├── mel/                 # UI da assistente
│   ├── auth/
│   └── layout/
└── app/[locale]/(app)/      # área autenticada
```

Cada módulo exporta:
- `meta` — id, label, estado (`active` \| `preview` \| `coming_soon`)
- serviços tipados sem importar UI
- actions em `src/actions/` que orquestram, sem lógica de domínio

Novos módulos registam-se em `registry.ts` e activam-se por `UserModule` — sem reescrever o core.

---

## Autenticação

1. **Registo / login** com e-mail e palavra-passe
2. Após o 1.º login, o utilizador pode activar **biometria** (`biometricsEnabled`, `biometricCredentialId`, `pinHash`)
3. Na Web: WebAuthn / plataforma (Face ID, Touch ID, Windows Hello) quando disponível
4. Clientes nativos futuros consomem as mesmas flags sem alterar o schema

---

## Fluxo MVP

```
Landing → Registo/Login → Hoje (dashboard)
                ↓
     Captura por voz/texto → intent → tarefa | evento
                ↓
     Tarefas · Calendário · Relatório semanal
```

---

## Schema Postgres

Em Neon partilhado com outros produtos, a Mel usa o schema `mel` (`MEL_PG_SCHEMA` / `FORCE_MEL_SCHEMA`). Em desenvolvimento local usa `public`.

---

## Roadmap

| Fase | Foco |
|------|------|
| **1 (este PR)** | Fundação + tarefas + calendário + voz + relatórios + auth/biometria |
| 2 | Hábitos e lembretes activos |
| 3 | Integrações calendário externas (Google / Apple) |
| 4 | Apps nativas (React Native / Capacitor) sobre a mesma API |
