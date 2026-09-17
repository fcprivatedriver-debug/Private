/**
 * Testes unitários — sync parsers, import, frescura, gates (sem inventar dados).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDgegPriceToMilli, parseDgegDate, isDgegSyncAllowed } from "./sync/dgeg-fuel";
import { mapMobieLisboaFeature } from "./sync/mobie-lisboa";
import { validateProductRows, parseProductCsv } from "./import/products";
import { formatUpdatedAt, buildFreshness } from "./freshness";
import { haversineKm } from "./geo";
import { isStale, TTL } from "./ttl";
import { assertCronAuth, assertExternalDataAdmin } from "./admin";

describe("DGEG parsers", () => {
  it("parse preço 1,899 € → 1899 milli", () => {
    assert.equal(parseDgegPriceToMilli("1,899 €"), 1899);
    assert.equal(parseDgegPriceToMilli("1.729€"), 1729);
    assert.equal(parseDgegPriceToMilli("invalid"), null);
  });

  it("parse DataAtualizacao", () => {
    const d = parseDgegDate("2026-09-15 08:40");
    assert.ok(d);
    assert.equal(d!.getFullYear(), 2026);
    assert.equal(d!.getMonth(), 8);
    assert.equal(d!.getDate(), 15);
    assert.equal(d!.getHours(), 8);
    assert.equal(d!.getMinutes(), 40);
  });

  it("gate DGEG exige ENABLED + PARTILHA_ACK", () => {
    const prevE = process.env.DGEG_FUEL_ENABLED;
    const prevA = process.env.DGEG_PARTILHA_ACK;
    delete process.env.DGEG_FUEL_ENABLED;
    delete process.env.DGEG_PARTILHA_ACK;
    assert.equal(isDgegSyncAllowed().ok, false);
    process.env.DGEG_FUEL_ENABLED = "true";
    assert.equal(isDgegSyncAllowed().ok, false);
    process.env.DGEG_PARTILHA_ACK = "true";
    assert.equal(isDgegSyncAllowed().ok, true);
    if (prevE === undefined) delete process.env.DGEG_FUEL_ENABLED;
    else process.env.DGEG_FUEL_ENABLED = prevE;
    if (prevA === undefined) delete process.env.DGEG_PARTILHA_ACK;
    else process.env.DGEG_PARTILHA_ACK = prevA;
  });
});

describe("MOBI Lisboa mapper", () => {
  it("mapeia feature GeoJSON realista", () => {
    const fetchedAt = new Date("2026-09-16T12:00:00Z");
    const mapped = mapMobieLisboaFeature(
      {
        id: 1,
        geometry: { type: "Point", coordinates: [-9.21, 38.69] },
        properties: {
          COD_SIG: "LSB-00003",
          DESIGNACAO: "Vela Latina",
          MORADA: "Doca do Bom Sucesso",
          TOMADAS: 2,
        },
      },
      fetchedAt,
    );
    assert.ok(mapped);
    assert.equal(mapped!.externalId, "LSB-00003");
    assert.equal(mapped!.name, "Vela Latina");
    assert.equal(mapped!.lat, 38.69);
    assert.equal(mapped!.lng, -9.21);
    assert.equal(mapped!.connectorCount, 2);
    assert.equal(mapped!.powerKw, null);
    assert.equal(mapped!.tariffJson, null);
  });

  it("rejeita feature sem coordenadas", () => {
    assert.equal(mapMobieLisboaFeature({ properties: { COD_SIG: "x" } }, new Date()), null);
  });
});

describe("import produtos", () => {
  it("valida e rejeita preços inválidos sem destruir fluxo", () => {
    const { valid, invalid } = validateProductRows(
      [
        { name: "Leite 1L", price: 0.89 },
        { name: "", price: 1 },
        { name: "Pão", price: -1 },
        { name: "Café", price: 3.5, currency: "USD" },
      ],
      { store: "continente" },
    );
    assert.equal(valid.length, 1);
    assert.equal(valid[0].priceCents, 89);
    assert.equal(invalid.length, 3);
  });

  it("parse CSV com cabeçalho", () => {
    const rows = parseProductCsv("name,brand,price\nArroz,Caçarola,1.29\n");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "Arroz");
    assert.equal(rows[0].brand, "Caçarola");
    assert.equal(rows[0].price, 1.29);
  });
});

describe("frescura e geo", () => {
  it("formatUpdatedAt", () => {
    const now = new Date("2026-09-16T15:00:00");
    assert.match(formatUpdatedAt(new Date("2026-09-16T14:50:00"), now), /há 10 min/);
    const f = buildFreshness({
      fetchedAt: new Date("2026-09-15T22:15:00"),
      stale: true,
      source: "DGEG",
      now,
    });
    assert.equal(f.stale, true);
    assert.equal(f.source, "DGEG");
  });

  it("haversine Lisboa-Cascais ~25km", () => {
    const km = haversineKm({ lat: 38.7223, lng: -9.1393 }, { lat: 38.697, lng: -9.421 });
    assert.ok(km > 20 && km < 35);
  });

  it("isStale", () => {
    assert.equal(isStale(new Date(), TTL.FUEL_STALE_MS), false);
    assert.equal(isStale(new Date(Date.now() - TTL.FUEL_STALE_MS - 1000), TTL.FUEL_STALE_MS), true);
  });
});

describe("auth admin/cron", () => {
  it("cron exige Bearer CRON_SECRET", () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "test-secret";
    assert.equal(assertCronAuth(null), false);
    assert.equal(assertCronAuth("Bearer wrong"), false);
    assert.equal(assertCronAuth("Bearer test-secret"), true);
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  });

  it("admin key", () => {
    const prev = process.env.EXTERNAL_DATA_ADMIN_KEY;
    const prev2 = process.env.PRODUCT_ACCESS_ADMIN_KEY;
    delete process.env.EXTERNAL_DATA_ADMIN_KEY;
    delete process.env.PRODUCT_ACCESS_ADMIN_KEY;
    assert.equal(assertExternalDataAdmin("x").ok, false);
    process.env.EXTERNAL_DATA_ADMIN_KEY = "adm";
    assert.equal(assertExternalDataAdmin("adm").ok, true);
    assert.equal(assertExternalDataAdmin("no").ok, false);
    if (prev === undefined) delete process.env.EXTERNAL_DATA_ADMIN_KEY;
    else process.env.EXTERNAL_DATA_ADMIN_KEY = prev;
    if (prev2 === undefined) delete process.env.PRODUCT_ACCESS_ADMIN_KEY;
    else process.env.PRODUCT_ACCESS_ADMIN_KEY = prev2;
  });
});
