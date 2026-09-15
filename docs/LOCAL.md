# Como testar a Nina no teu computador

Guia passo a passo para abrir a aplicação no browser (sem publicar).

## O que precisas

- Node.js 20+ e npm
- PostgreSQL a correr localmente
- Terminal na pasta do projeto

## 1. Variáveis de ambiente

Na pasta do projeto deve existir um ficheiro `.env` (já há um de exemplo):

```bash
cp .env.example .env
```

Confirma que `.env` tem (ajusta user/password da BD se precisares):

```
DATABASE_URL="postgresql://mafil:mafil@127.0.0.1:5432/mafil?schema=public"
DIRECT_URL="postgresql://mafil:mafil@127.0.0.1:5432/mafil?schema=public"
AUTH_SECRET="nina-demo-auth-secret-do-not-use-in-real-prod-32b"
AUTH_TRUST_HOST="true"
NEXT_PUBLIC_APP_NAME="Nina"
DEMO_MODE="true"
```

## 2. Instalar dependências

```bash
npm install
```

## 3. Base de dados + dados demo

```bash
npx prisma migrate deploy
npm run db:demo
```

Isto cria/atualiza as tabelas e carrega:

| Conta | Email | Password |
|-------|-------|----------|
| **Filipe** | `familia@nina.app` | `nina123` |
| **Nina** | `nina@nina.app` | `nina123` |

Também inclui: Conta Familiar, receitas, despesas, lista de compras, objetivos, orçamentos, categorias/subcategorias, faturas de exemplo, alertas, ligações e estatísticas.

## 4. Iniciar a aplicação

**Modo desenvolvimento** (recomendado para testar):

```bash
npm run dev
```

**Ou** build + produção local:

```bash
npm run build
npm run start -- -p 3000
```

## 5. Abrir no browser

Endereço:

**http://localhost:3000/pt/login**

(Landing: http://localhost:3000/pt)

Entra com `familia@nina.app` / `nina123` (Filipe) ou `nina@nina.app` / `nina123` (Nina).

## 6. Onde explorar

| Página | URL |
|--------|-----|
| Captura Instantânea | http://localhost:3000/pt/captura |
| Conversar com a Nina | http://localhost:3000/pt/dashboard |
| Gastos | http://localhost:3000/pt/despesas |
| Lista de compras | http://localhost:3000/pt/lista |
| Conta Familiar | http://localhost:3000/pt/familia |
| Ligações | http://localhost:3000/pt/ligacoes |
| Objetivos | http://localhost:3000/pt/objetivos |
| Resumo / gráficos | http://localhost:3000/pt/estatisticas |
| Memória | http://localhost:3000/pt/memoria |

## Recarregar dados demo

Se quiseres voltar ao estado inicial:

```bash
npm run db:demo
```

## Problemas comuns

- **Porta 3000 ocupada:** `npm run start -- -p 3001` e abre `http://localhost:3001/pt/login`
- **Erro de base de dados:** confirma que o PostgreSQL está a correr e que `DATABASE_URL` está correto
- **Login falha:** volta a correr `npm run db:demo`
