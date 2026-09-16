"use server";

import { revalidatePath } from "next/cache";
import {
  assertExternalDataAdmin,
  getExternalDataAdminSnapshot,
  syncSource,
  importProducts,
  parseProductCsv,
} from "@/lib/external-data";
import type { SyncableSource } from "@/lib/external-data/sync";
import type { ProductImportStore, ProductImportRow } from "@/lib/external-data/import/products";

export async function loadExternalDataAdmin(adminKey: string) {
  const auth = assertExternalDataAdmin(adminKey);
  if (!auth.ok) return { ok: false as const, error: auth.error };
  const snapshot = await getExternalDataAdminSnapshot();
  return { ok: true as const, snapshot };
}

export async function triggerExternalSync(formData: FormData) {
  const adminKey = String(formData.get("adminKey") || "");
  const source = String(formData.get("source") || "") as SyncableSource;
  const auth = assertExternalDataAdmin(adminKey);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const allowed: SyncableSource[] = [
    "DGEG_FUEL",
    "MOBIE_LISBOA",
    "CONTINENTE",
    "PINGO_DOCE",
    "AUCHAN",
  ];
  if (!allowed.includes(source)) {
    return { ok: false as const, error: "Fonte inválida" };
  }

  const result = await syncSource(source, { triggeredBy: "admin", force: false });
  revalidatePath("/pt/admin/dados-externos");
  return { ok: true as const, result };
}

export async function importExternalProducts(formData: FormData) {
  const adminKey = String(formData.get("adminKey") || "");
  const auth = assertExternalDataAdmin(adminKey);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const store = String(formData.get("store") || "") as ProductImportStore;
  if (!["continente", "pingo_doce", "auchan"].includes(store)) {
    return { ok: false as const, error: "Loja inválida" };
  }

  const priceIsCents = String(formData.get("priceIsCents") || "") === "true";
  const raw = String(formData.get("payload") || "").trim();
  if (!raw) return { ok: false as const, error: "Payload vazio" };

  let rows: ProductImportRow[];
  try {
    if (raw.startsWith("[") || raw.startsWith("{")) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        rows = parsed as ProductImportRow[];
      } else if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { products?: unknown }).products)
      ) {
        rows = (parsed as { products: ProductImportRow[] }).products;
      } else {
        return { ok: false as const, error: "JSON deve ser array ou { products: [] }" };
      }
    } else {
      rows = parseProductCsv(raw);
    }
  } catch {
    return { ok: false as const, error: "JSON/CSV inválido" };
  }

  const result = await importProducts({
    store,
    rows,
    priceIsCents,
    triggeredBy: "admin",
  });
  revalidatePath("/pt/admin/dados-externos");
  return { ok: true as const, result };
}
