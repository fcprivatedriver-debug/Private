# Nina — Assistente financeira pessoal

Aplicação moderna para controlar receitas e despesas da família, orçamentos, objetivos de poupança e insights com IA. Feita para Portugal (EUR, retalho, energia, Open Banking).

**Brand:** Nina · **Moeda:** EUR · **Idioma:** Português (EN disponível) · **Base de dados:** PostgreSQL

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS v4
- Auth.js (credentials + Google opcional) · Prisma · PostgreSQL
- next-intl (`/pt`, `/en`)
- Arquitetura modular: OCR, importações, IA, exportação, Open Banking stubs

## Arranque local

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

### Conta demo

| Email | Password |
|-------|----------|
| `familia@nina.app` | `nina123` |
| `ana@nina.app` | `nina123` |

## Melhoria da Experiência do Utilizador e Inteligência Adaptativa da Nina

Funcionalidade integrada (não duas secções separadas):

- Registo extremamente simples e Conta Familiar via convite por **link ou QR Code**
- Perfis individuais com autenticação própria (PIN, biometria)
- Separação entre **As Minhas Finanças** e **Conta Familiar**
- Compreensão automática de despesas pessoais, familiares ou profissionais
- Aprendizagem contínua a partir das confirmações do utilizador
- Memória personalizada com regras editáveis
- Automatização progressiva (cada vez menos perguntas)
- Sugestões inteligentes e análise de padrões de consumo
- Filosofia: *quanto mais a Nina é utilizada, menos trabalho o utilizador tem*

Documento completo: [`docs/PRODUCT.md`](docs/PRODUCT.md)

## Ligações da Nina

Automatização personalizada por módulos opcionais (`/pt/ligacoes`): autorizar, pausar ou remover bancos, email, supermercados e outros — nunca obrigatório. Sem ligações, a voz continua a funcionar.

## Outras capacidades

- Dashboard conversacional com a Nina
- Receitas e despesas com categorias PT
- OCR de faturas · importações (Continente, Galp, MB Way, CSV, …)
- Orçamentos, estatísticas, pesquisa, alertas, recorrentes
- Tema claro / escuro · exportação PDF / Excel / CSV

## Ambiente

| Variável | Exemplo |
|----------|---------|
| `DATABASE_URL` | PostgreSQL |
| `DIRECT_URL` | PostgreSQL (migrate) |
| `AUTH_SECRET` | 32+ chars |
| `NEXT_PUBLIC_APP_NAME` | `Nina` |

Ver também `docs/ARCHITECTURE.md` e `docs/PR_VISUAL_PROOF.md`.
