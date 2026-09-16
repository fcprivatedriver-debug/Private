# Relatório — Faturas / anexos + Digest 4091516702

Data: 2026-09-16  
Branch: `cursor/invoice-attachments-ec69`  
Base: `cursor/mel-openai-integration-0ecb` (produção)  
**Sem deploy.**

## 1. Causa EXATA do Digest 4091516702

`instantCapturePhoto` (`src/actions/capture.ts`) chamava `storeFamilyFile` (`src/lib/storage.ts`), que fazia `fs.mkdir` + `fs.writeFile` em `process.cwd()/uploads`.

No runtime Vercel o filesystem da aplicação é **read-only** (excepto `/tmp` efémero). A escrita falhava com excepção **não tratada** na Server Action → Next.js mostrava:

> Application error: a server-side exception has occurred while loading www.addandknow.pt  
> Digest: 4091516702

## 2. Ficheiro / função

- `src/lib/storage.ts` → `storeFamilyFile` (writeFile em cwd)
- `src/actions/capture.ts` → `instantCapturePhoto` (chamava storage sem try/catch)
- Agravante: após upload, o fluxo antigo ainda criava despesa com OCR fictício (total **24,87 €** / 2487 cêntimos)

## 3. Correção

- Persistência em **Neon BYTEA** (`StoredObject`) — sem filesystem Vercel, sem serviço pago novo
- `instantCapturePhoto` deixa de crashar; grava ficheiro na BD e **não** cria despesa inventada
- OCR honesto: `available: false` (zero 2487)
- UI: removidos «URL fotografia/PDF»; novo «Anexar fatura» (câmara / galeria / PDF)
- `/api/uploads/[...key]` lê da BD + autorização Pessoal/Familiar

## 4–5. Antes / agora

**Antes:** URL manual + writeFile Vercel → Application Error; OCR inventava valores.  
**Agora:** Tirar foto / escolher ficheiro → upload para Neon → associação à despesa; OCR indisponível até motor real.

## 6–9. Storage / Filipe / env

- Armazenamento: tabela `StoredObject` na Neon existente
- **Não** é obrigatório configurar Vercel Blob
- Env opcional futura: `BLOB_READ_WRITE_TOKEN` (não activada)
- Filipe: aplicar migration `20260916190000_stored_object_receipts` no próximo deploy

## 10–15. Limites / permissões / OCR

- Máx. **5 MB** · JPEG, PNG, WEBP, PDF
- Pessoal: só dono (ou OWNER/ADMIN) vê fatura; Familiar: membros da família
- Acesso via `/api/uploads/...` autenticado + check de despesa
- Persistente após logout/login (Neon)
- OCR: **apenas arquitectura preparada** — sem extracção real

## 16–17. Migrations

- Criada: `prisma/migrations/20260916190000_stored_object_receipts`
- **Sim — tem de ser aplicada em produção** no próximo deploy (`db:deploy`)

## 18–19. Testes / build

- Unit: validação MIME/tamanho/path + OCR ≠ 2487
- Smoke: store/read/delete em Neon local
- typecheck OK · lint 0 errors · build OK

## 20. Acções manuais Filipe

1. Merge deste PR na linha de produção
2. No deploy: garantir `prisma migrate deploy` (já no `vercel-build.mjs`)
3. Confirmar que a migration `StoredObject` corre na Neon de produção
4. Testar em www: Despesas → Anexar fatura → guardar → logout/login → Ver fatura
5. (Opcional) Vercel Blob mais tarde — não necessário agora
