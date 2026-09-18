# Causa exacta — “Não foi possível guardar a fatura”

## Ambiente testado (antes do fix)

| Campo | Valor |
|-------|--------|
| URL | `https://www.addandknow.pt` / `https://addandknow.pt` |
| Build ID | `LkIBDvMReh74Ksibfsap4` |
| SHA Production addynow | `488f927` (main — inclui BYTEA/base64 do PR #52, **sem** schema-qualify) |
| Resposta Server Action | `{"ok":false,"error":"Não foi possível guardar a fatura. Tenta novamente."}` em `/pt/ocr`, `/pt/captura?mode=photo`, `/pt/despesas/nova` |

Preview de ficheiro OK → falha só no **guardar**.

## Causa exacta

1. Em Production, `PrismaNeon` é criado com `{ schema: "nina" }` (`src/lib/db.ts`).
2. Queries de modelo (`prisma.storedObject.*`) são qualificáveis para `nina`.
3. O INSERT de fatura usa **`$executeRaw`** em `insertStoredObjectProps` (`src/lib/storage.ts`) com:
   `INSERT INTO "StoredObject" (...)` **sem** schema.
4. Driver adapters (**não** definem `search_path` para raw SQL). O PostgreSQL resolve `"StoredObject"` em `public`.
5. Em Neon Production a tabela existe em **`nina."StoredObject"`**, não em `public`.
6. Postgres devolve **`42P01` — `relation "StoredObject" does not exist`**.
7. O `catch` em `storeFamilyFile` mascara a excepção como `StorageError(WRITE_FAILED)` → mensagem genérica ao cliente.

### Prova local (adapter + schema=nina, só `nina.StoredObject`)

```
model count OK
raw unqualified INSERT FAIL: 42P01 relation "StoredObject" does not exist
raw nina."StoredObject" INSERT OK
```

Isto explica porque o fluxo **passava localmente** (`schema=public`) e **falhava em Production** (`schema=nina` + raw SQL).

Não é: câmara/galeria, MIME, tamanho, auth de sessão (login OK), nem deploy desatualizado do fix BYTEA — o SHA `488f927` já tinha decode/encode base64, mas com tabela não qualificada.

## Correção

`storedObjectRelation()` → `nina."StoredObject"` quando `resolveNinaSchema()` está activo; INSERT/SELECT/DELETE usam `${storedObjectRelation()}`.

## Logs Vercel

Sem `VERCEL_TOKEN` neste agente: runtime logs do dashboard não são legíveis via API. A falha foi reproduzida no domínio live (resposta da Server Action) + prova determinística do erro `42P01` com o mesmo padrão adapter+schema.
