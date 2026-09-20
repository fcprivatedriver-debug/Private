# Causa raiz — Preview `prisma.storedObject.create` / InvalidArg (revisão PR #62)

## Sintoma reportado (Android real)

No Preview voltou a aparecer a assinatura histórica:

`prisma.storedObject.create() → Raw query failed / InvalidArg / JS functions cannot…`

Em paralelo: Fatura abria a câmara sozinha; UI podia mostrar erro e «Fatura guardada.» juntos.

## Investigação obrigatória (histórico)

| Referência | Commit | O que corrigiu |
|------------|--------|----------------|
| PR #48 | `d5ae70a` | BYTEA via `decode(base64)` / `encode(base64)` — **sem** `Bytes`/`Uint8Array` no Prisma create |
| PR #54 | `d5c35fa` | `storedObjectRelation()` → `nina."StoredObject"` (raw SQL + schema) |
| PR #42 | `d72b341` | `instantCapturePhoto` usa `membership.userId`; mensagem de fatura segura |

## Prova no código actual (main `6741d71` + este hotfix)

1. **Nenhum caller de escrita** usa `prisma.storedObject.create`:
   - `rg 'storedObject\.create' src` → só comentários/docs em `storage.ts`
   - Writes: `insertStoredObjectProps` → `$executeRaw` + `decode(base64)`
   - Reads: `selectStoredObjectByKey` → `encode(base64)`
2. **Caminhos de upload auditados** (todos passam por base64 SQL):
   - Fatura captura: `instantCapturePhoto` → `storeReceiptFromFormFile` → `storeFamilyFile`
   - OCR: `runOcrPreview` → mesmo helper
   - Despesas/receitas: `finance.ts` → mesmo helper
   - Foto perfil Pessoal/Familiar: `uploadSpacePhoto` → `storeProfilePhoto` → `insertStoredObjectProps`
3. **PR #62 Preview** (`bc40af8` sobre `6741d71`) **já inclui** #48+#54 no source — a assinatura `create(Bytes)` **não existe** no bundle de escrita.

## Porque o Preview «continuava a apresentar» a assinatura antiga

A assinatura `prisma.storedObject.create() / InvalidArg / JS functions cannot` é o **erro exacto do caminho Bytes pré-#48**. Com o source actual:

- Um INSERT falhado via `$executeRaw` **não** produz essa assinatura de modelo `storedObject.create`.
- O `catch` em `storeFamilyFile` mapeia **qualquer** falha de INSERT para `STORAGE_USER_ERRORS.WRITE_FAILED` («Não foi possível guardar a fatura…») — **sem** embutir a mensagem Prisma.
- Portanto, ver literalmente `prisma.storedObject.create()` na UI/logs de **runtime do Preview actual** só seria possível se:
  1. o cliente estivesse a falar com um **deploy antigo** (pré-#48), ou
  2. a mensagem viesse de **logs/histórico/docs** da regressão conhecida, não do handler actual, ou
  3. um overlay/digest de Server Action de build desactualizado.

**Não** se inventou outro workaround: o caminho correcto (#48+#54) já está no source; este hotfix **prova-o com regressão repo-wide** e impede o reaparecimento de `create(Bytes)`.

## Correções deste hotfix (além da prova storage)

1. **Câmara**: remover `auto=1` do fluxo Fatura (FAB, guia, manifest); InstantCapture deixa de fazer `cameraRef.click()` em photo+auto; `captura/page` só autoStart em voz.
2. **UI**: erro e sucesso são mutuamente exclusivos; «Fatura guardada» só com `ok` + `receiptUrl`; sanitização client-side contra stack Prisma/Neon.
3. **Testes**: `storage-bytes-path.test.ts` varre todo `src/` por `storedObject.create`; `fatura-no-auto-camera.test.ts` trava o auto-open.

## Não fazer

- Merge para main / publish Production neste ciclo — só Preview novo.
