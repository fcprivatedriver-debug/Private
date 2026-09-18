# PR #54 — Guardar fatura em Production (schema `nina`)

## Changelog
- Corrigido o erro **“Não foi possível guardar a fatura. Tenta novamente.”** no domínio real.
- Causa: `$executeRaw` usava `INSERT INTO "StoredObject"` sem schema; com `PrismaNeon({ schema: "nina" })` a tabela resolve em `public` → Postgres `42P01`.
- Correção: qualificar `nina."StoredObject"` via `storedObjectRelation()` / `resolveNinaSchema()` em INSERT, SELECT e DELETE.
- Sem OCR fictício: fatura guarda-se; UI indica leitura automática indisponível; introdução manual.

## Novas funcionalidades
- Nenhuma feature nova — correção de persistência de anexos em Production.

## Prova no domínio real
- URL: `https://www.addandknow.pt`
- SHA: `d5c35fa`
- Build: `5ufpQ-LoQl09sjqCfXxCl`
- JPEG: `receiptUrl` + GET `/api/uploads/...` → 200; UI “Guardada · ver ficheiro”
- PDF: idem
- Despesa “Aceitação fatura d5c35fa” (−12,34 €) persiste após logout/login

## Artefactos
- `/opt/cursor/artifacts/screenshots/receipt-prod-accept/`
- `docs/RECEIPT_SAVE_ROOT_CAUSE.md`
