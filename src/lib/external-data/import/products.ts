/**
 * Importação manual de produtos (CSV/JSON) — alternativa quando auto-sync é impossível.
 * Validação estrita; nunca apaga dados anteriores em caso de falha parcial.
 */

import { createHash } from "crypto";
import type { ExternalDataSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runSync } from "../sync/runner";

export type ProductImportRow = {
  externalId?: string;
  name: string;
  brand?: string | null;
  packageLabel?: string | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  categoryKey?: string | null;
  productUrl?: string | null;
  imageUrl?: string | null;
  storeLocationId?: string | null;
  /** euros (1.99) ou cêntimos (199) — ver priceIsCents */
  price?: number;
  regularPrice?: number | null;
  promoPrice?: number | null;
  unitPrice?: number | null;
  unitLabel?: string | null;
  currency?: string;
  available?: boolean | null;
  sourceUpdatedAt?: string | null;
};

export type ProductImportStore = "continente" | "pingo_doce" | "auchan";

const STORE_SOURCE: Record<ProductImportStore, ExternalDataSource> = {
  continente: "CONTINENTE",
  pingo_doce: "PINGO_DOCE",
  auchan: "AUCHAN",
};

export type ValidatedProduct = {
  row: ProductImportRow;
  externalId: string;
  priceCents: number;
  regularPriceCents: number | null;
  promoPriceCents: number | null;
  unitPriceCents: number | null;
  currency: string;
  sourceUpdatedAt: Date | null;
  errors: string[];
};

function toCents(value: number, priceIsCents: boolean): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  if (priceIsCents) {
    const n = Math.round(value);
    return n > 0 && n < 1_000_000 ? n : null;
  }
  const n = Math.round(value * 100);
  return n > 0 && n < 1_000_000 ? n : null;
}

function stableId(store: string, name: string, brand?: string | null, pkg?: string | null): string {
  const raw = `${store}|${name}|${brand ?? ""}|${pkg ?? ""}`.toLowerCase().trim();
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}

export function validateProductRows(
  rows: ProductImportRow[],
  opts: { store: ProductImportStore; priceIsCents?: boolean },
): { valid: ValidatedProduct[]; invalid: ValidatedProduct[] } {
  const priceIsCents = opts.priceIsCents ?? false;
  const valid: ValidatedProduct[] = [];
  const invalid: ValidatedProduct[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const name = String(row.name || "").trim();
    if (!name || name.length < 2) errors.push("nome obrigatório");

    const priceRaw =
      row.promoPrice != null && Number.isFinite(row.promoPrice)
        ? row.promoPrice
        : row.price != null
          ? row.price
          : row.regularPrice;
    if (priceRaw == null) errors.push("preço obrigatório");

    const priceCents = priceRaw != null ? toCents(Number(priceRaw), priceIsCents) : null;
    if (priceCents == null) errors.push("preço inválido");

    const currency = (row.currency || "EUR").toUpperCase();
    if (currency !== "EUR") errors.push("apenas EUR suportado");

    let sourceUpdatedAt: Date | null = null;
    if (row.sourceUpdatedAt) {
      const d = new Date(row.sourceUpdatedAt);
      if (Number.isNaN(d.getTime())) errors.push("sourceUpdatedAt inválido");
      else sourceUpdatedAt = d;
    }

    const regularPriceCents =
      row.regularPrice != null ? toCents(Number(row.regularPrice), priceIsCents) : null;
    const promoPriceCents =
      row.promoPrice != null ? toCents(Number(row.promoPrice), priceIsCents) : null;
    const unitPriceCents =
      row.unitPrice != null ? toCents(Number(row.unitPrice), priceIsCents) : null;

    const externalId =
      (row.externalId && String(row.externalId).trim()) ||
      stableId(opts.store, name, row.brand, row.packageLabel);

    const entry: ValidatedProduct = {
      row: { ...row, name },
      externalId,
      priceCents: priceCents ?? 0,
      regularPriceCents,
      promoPriceCents,
      unitPriceCents,
      currency,
      sourceUpdatedAt,
      errors,
    };
    if (errors.length) invalid.push(entry);
    else valid.push(entry);
  }

  return { valid, invalid };
}

/** Parse CSV simples (vírgula); cabeçalho obrigatório. */
export function parseProductCsv(csv: string): ProductImportRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: ProductImportRow[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i] ?? "";
    });
    rows.push({
      externalId: obj.externalid || obj.external_id || undefined,
      name: obj.name || obj.nome || "",
      brand: obj.brand || obj.marca || null,
      packageLabel: obj.packagelabel || obj.embalagem || null,
      quantityValue: obj.quantityvalue ? Number(obj.quantityvalue) : null,
      quantityUnit: obj.quantityunit || obj.unidade || null,
      categoryKey: obj.categorykey || obj.categoria || null,
      productUrl: obj.producturl || obj.url || null,
      price: obj.price || obj.preco ? Number(obj.price || obj.preco) : undefined,
      regularPrice: obj.regularprice ? Number(obj.regularprice) : null,
      promoPrice: obj.promoprice || obj.preco_promo ? Number(obj.promoprice || obj.preco_promo) : null,
      unitPrice: obj.unitprice ? Number(obj.unitprice) : null,
      unitLabel: obj.unitlabel || null,
      currency: obj.currency || "EUR",
      available: obj.available === "" ? null : obj.available === "true" || obj.available === "1",
      sourceUpdatedAt: obj.sourceupdatedat || obj.updated_at || null,
    });
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

export async function importProducts(opts: {
  store: ProductImportStore;
  rows: ProductImportRow[];
  priceIsCents?: boolean;
  triggeredBy?: "admin" | "import" | "test";
}): Promise<{
  ok: boolean;
  imported: number;
  rejected: number;
  errors: string[];
  syncId: string;
}> {
  const source = STORE_SOURCE[opts.store];
  const { valid, invalid } = validateProductRows(opts.rows, {
    store: opts.store,
    priceIsCents: opts.priceIsCents,
  });

  if (valid.length === 0) {
    return {
      ok: false,
      imported: 0,
      rejected: invalid.length,
      errors: invalid.slice(0, 10).map((v) => `${v.row.name || "?"}: ${v.errors.join(", ")}`),
      syncId: "",
    };
  }

  const result = await runSync(
    source,
    async () => {
      const fetchedAt = new Date();
      let recordsUpserted = 0;
      for (const v of valid) {
        const product = await prisma.extProduct.upsert({
          where: {
            source_store_externalId: {
              source,
              store: opts.store,
              externalId: v.externalId,
            },
          },
          create: {
            source,
            externalId: v.externalId,
            store: opts.store,
            storeLocationId: v.row.storeLocationId ?? null,
            name: v.row.name,
            brand: v.row.brand ?? null,
            packageLabel: v.row.packageLabel ?? null,
            quantityValue: v.row.quantityValue ?? null,
            quantityUnit: v.row.quantityUnit ?? null,
            categoryKey: v.row.categoryKey ?? null,
            productUrl: v.row.productUrl ?? null,
            imageUrl: v.row.imageUrl ?? null,
            fetchedAt,
          },
          update: {
            name: v.row.name,
            brand: v.row.brand ?? null,
            packageLabel: v.row.packageLabel ?? null,
            quantityValue: v.row.quantityValue ?? null,
            quantityUnit: v.row.quantityUnit ?? null,
            categoryKey: v.row.categoryKey ?? null,
            productUrl: v.row.productUrl ?? null,
            imageUrl: v.row.imageUrl ?? null,
            storeLocationId: v.row.storeLocationId ?? null,
            fetchedAt,
          },
        });

        // Nova linha de preço (histórico leve) + mantém a mais recente via fetchedAt
        await prisma.extProductPrice.create({
          data: {
            productId: product.id,
            regularPriceCents: v.regularPriceCents,
            promoPriceCents: v.promoPriceCents,
            priceCents: v.priceCents,
            unitPriceCents: v.unitPriceCents,
            unitLabel: v.row.unitLabel ?? null,
            currency: v.currency,
            available: v.row.available ?? null,
            sourceUpdatedAt: v.sourceUpdatedAt,
            fetchedAt,
          },
        });
        recordsUpserted += 1;
      }
      return {
        recordsSeen: opts.rows.length,
        recordsUpserted,
        meta: { store: opts.store, rejected: invalid.length },
        partialError:
          invalid.length > 0
            ? `${invalid.length} linhas rejeitadas na validação`
            : undefined,
      };
    },
    { triggeredBy: opts.triggeredBy ?? "import" },
  );

  return {
    ok: result.status === "SUCCESS" || result.status === "PARTIAL",
    imported: result.recordsUpserted,
    rejected: invalid.length,
    errors: invalid.slice(0, 10).map((v) => `${v.row.name || "?"}: ${v.errors.join(", ")}`),
    syncId: result.syncId,
  };
}
