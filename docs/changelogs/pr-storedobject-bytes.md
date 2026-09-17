# Changelog — Fix StoredObject BYTEA (Neon InvalidArg)

## Problema
Após PR #46 (ENOENT → Neon), guardar fatura falhava em produção com:
`prisma.storedObject.create()` → Raw query failed / InvalidArg / "JS functions cannot…"

## Causa raiz
`Bytes`/`Uint8Array` via `@prisma/adapter-neon` (produção) não serializa correctamente
para parâmetros SQL → NAPI InvalidArg. Mensagem truncada na UI vinha de
`StorageError` a embutir `err.message` do Prisma.

## Correção
- Gravar/ler BYTEA com SQL `decode(base64)` / `encode(...,'base64')` (só TEXT nos params)
- Erros de UI seguros (sem Prisma/Neon/stack)
- Pin `@prisma/adapter-neon@6.19.3` alinhado com `@prisma/client@6.19.3`

## Testes
- smoke-receipt-storage + smoke-receipt-full-flow
- unit storage + bytes-path regression
- typecheck / lint / build
