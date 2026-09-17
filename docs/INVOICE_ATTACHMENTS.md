# Relatório — Faturas / anexos + Digests 4091516702 e 2807674233

Data: 2026-09-16  
Branch: `cursor/family-email-invites-ec69` (integra correção de storage)  
Base produção: `39110ea` (`cursor/mel-openai-integration-0ecb`)  
**Sem deploy.**

## Digest 2807674233 (ENOENT) — causa EXATA

Nos logs Vercel: `Error: ENOENT: no such file or directory`.

### Caminho exacto
`{process.cwd()}/uploads/families/{familyId}/{timestamp}-{uuid}-{filename}`  
Em Vercel tipicamente sob `/var/task/uploads/...` (filesystem da app **read-only / sem persistência**).

### Função
1. **Escrita (mesmo eixo do Digest 4091516702):**  
   `storeFamilyFile` → `fs.mkdir` + `fs.writeFile` em `cwd/uploads`  
   Chamada por `instantCapturePhoto` / anexar fatura (Server Action).
2. **Leitura (ENOENT explícito):**  
   `readStoredFile` → `fs.readFile` no mesmo caminho  
   Chamada por `GET /api/uploads/[...key]` quando a UI tenta abrir uma fatura cujo URL ficou na BD mas o ficheiro **nunca persistiu** (ou foi perdido no FS efémero).

### Ficheiro do projeto (antes da correção)
- `src/lib/storage.ts` — `storeFamilyFile` / `readStoredFile`
- `src/actions/capture.ts` — `instantCapturePhoto`
- `src/app/api/uploads/[...key]/route.ts` — `GET` sem tratar ENOENT

### Relação com Digests
| Digest | Sintoma | Relação |
|--------|---------|---------|
| **4091516702** | Application Error ao fotografar/anexar | Mesma causa raiz: writeFile em cwd/uploads |
| **2807674233** | ENOENT nos logs + Application Error / falha ao carregar recurso | Mesma causa raiz; código ENOENT típico de **readFile** (ou mkdir/write sem directório) no path `uploads/...` |

Não é um segundo bug independente: é a **mesma arquitectura de storage local** a falhar no runtime Vercel.

## Correção aplicada

- Persistência em **Neon** (`StoredObject` BYTEA) — sem filesystem Vercel
- Em Vercel **nunca** se faz fallback `readFile` local (evita ENOENT)
- `instantCapturePhoto` / anexar fatura tratam `StorageError` sem derrubar a app
- `/api/uploads` devolve 404 tipado em vez de excepção não tratada
- Isolamento Pessoal: só o próprio membro vê anexos PERSONAL

### Follow-up (InvalidArg / Bytes + Neon adapter)

Em produção, após o ENOENT estar resolvido, `prisma.storedObject.create({ data: Uint8Array })`
falhava com `Raw query failed` / `InvalidArg` / `JS functions cannot be represented…`
(driver adapter Neon a serializar `Bytes`).

Correção: gravar/ler BYTEA via SQL `decode(base64)` / `encode(..., 'base64')`
(parâmetros só TEXT). Erros de UI nunca expõem mensagens Prisma/Neon.
Adapter alinhado: `@prisma/adapter-neon@6.19.3` (= client).

## Migration

`prisma/migrations/20260916190000_stored_object_receipts`  
**Tem de ser aplicada em produção** no próximo deploy (`prisma migrate deploy` já no `vercel-build.mjs`).

## Env vars

- Nenhuma nova obrigatória
- Opcional futuro: `BLOB_READ_WRITE_TOKEN` (Vercel Blob) — não necessário agora

## Acções manuais Filipe

1. Merge + deploy desta linha (ou PR #44 + este PR)
2. Confirmar migration `StoredObject` na Neon de produção
3. Testar: Captura foto / Despesas → Anexar fatura → Ver fatura → logout/login
4. Links `/api/uploads/...` antigos (só URL na BD, sem bytes) continuam 404 limpo — reanexar se necessário
5. **Não fazer deploy automático neste passo** (pedido explícito)

## Testes / build

- Unit storage + OCR honesty
- typecheck / lint / build
