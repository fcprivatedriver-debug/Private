# Mel — Assistente Pessoal Inteligente

Organiza a vida por voz e texto: tarefas, calendário, hábitos, lembretes e relatórios semanais.

**Brand:** Mel · **Idioma:** Português (Portugal) · **Plataformas:** Web + PWA (Android / iPhone)

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (e-mail + palavra-passe) · Prisma · PostgreSQL
- next-intl (`/pt`, `/en`)
- Arquitectura modular (`src/modules/*`)

## Arranque local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Contas demo (palavra-passe: `mel123`)

| Pessoa | Email |
|--------|-------|
| Filipe | `filipe@mel.app` |
| Mel    | `mel@mel.app` |

## MVP

1. **Autenticação** — e-mail / palavra-passe + opção biométrica após o 1.º login
2. **Tarefas** — criar, concluir, prioridades
3. **Calendário** — eventos da semana
4. **Captura por voz** — Web Speech + texto → tarefa / evento / lembrete
5. **Relatórios semanais** — métricas e destaques

Hábitos e lembretes activos estão preparados no schema e no registo de módulos.

## Ambiente

| Variável | Exemplo |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `DIRECT_URL` | PostgreSQL (migrate) |
| `AUTH_SECRET` | 32+ chars |
| `NEXT_PUBLIC_APP_NAME` | `Mel` |
| `MEL_PG_SCHEMA` | `mel` (Neon partilhado) |

Ver `docs/ARCHITECTURE.md` e `docs/PR_VISUAL_PROOF.md`.
