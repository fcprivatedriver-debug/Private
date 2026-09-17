/**
 * Script de verificação live: sync MOBI Lisboa + import produto teste + query.
 * Não activa DGEG (comercial restrito) salvo env.
 *
 * Uso: npx tsx scripts/sync-external-data-smoke.ts
 */
import { syncSource } from "../src/lib/external-data/sync";
import { importProducts } from "../src/lib/external-data/import/products";
import { searchCachedChargers } from "../src/lib/external-data/query/ev";
import { searchCachedFuel } from "../src/lib/external-data/query/fuel";
import { searchCachedProducts } from "../src/lib/external-data/query/products";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("=== MOBI Lisboa sync ===");
  const mobi = await syncSource("MOBIE_LISBOA", { triggeredBy: "test" });
  console.log(JSON.stringify(mobi, null, 2));

  const chargerCount = await prisma.extChargingStation.count({ where: { source: "MOBIE_LISBOA" } });
  console.log("chargers in DB:", chargerCount);

  const nearLx = await searchCachedChargers({
    lat: 38.7223,
    lng: -9.1393,
    radiusKm: 8,
    limit: 5,
  });
  console.log(
    "near LX sample:",
    nearLx.stations.map((s) => ({
      name: s.name,
      km: s.distanceKm,
      price: s.priceNote,
      updated: s.freshness.label,
    })),
  );

  console.log("=== Product import (manual) ===");
  const imp = await importProducts({
    store: "continente",
    triggeredBy: "test",
    rows: [
      {
        name: "Leite Mimosa Meio-gordo 1L",
        brand: "Mimosa",
        packageLabel: "1 L",
        price: 0.89,
        currency: "EUR",
        sourceUpdatedAt: new Date().toISOString(),
      },
      {
        name: "INVALID",
        price: -5,
      },
    ],
  });
  console.log(imp);

  const products = await searchCachedProducts({ query: "Leite", store: "continente" });
  console.log(
    "products:",
    products.map((p) => ({ name: p.name, priceCents: p.priceCents, stale: p.freshness.stale })),
  );

  console.log("=== DGEG (esperado bloqueado sem Partilha) ===");
  const dgeg = await syncSource("DGEG_FUEL", { triggeredBy: "test" });
  console.log({ status: dgeg.status, error: dgeg.errorSummary });

  const fuel = await searchCachedFuel({
    lat: 38.72,
    lng: -9.14,
    fuelType: "gasoleo_simples",
  });
  console.log("fuel cache:", { count: fuel.stations.length, reason: fuel.unavailableReason });

  console.log("=== supermarket auto sync (esperado falha) ===");
  for (const s of ["CONTINENTE", "PINGO_DOCE", "AUCHAN"] as const) {
    const r = await syncSource(s, { triggeredBy: "test" });
    console.log(s, r.status, r.errorSummary);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
