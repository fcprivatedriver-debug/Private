"use client";

import { useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { isMovioElite } from "@/config/constants";
import { acceptOfferAction } from "@/actions/marketplace";

export type OfferCardData = {
  id: string;
  priceAmount: number;
  currency: string;
  message?: string | null;
  estimatedArrivalMinutes?: number | null;
  createdAt: string | Date;
  driver: {
    id: string;
    name: string;
    image?: string | null;
    profileId?: string | null;
    photoUrl?: string | null;
    ratingAvg?: number | null;
    ratingCount?: number | null;
    yearsOfExperience?: number | null;
    completedTripsCount?: number | null;
    languagesSpoken?: string | null;
    avgResponseTimeMinutes?: number | null;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    photoUrls?: string;
    ratingAvg?: number | null;
    ratingCount?: number | null;
    className?: string;
  } | null;
};

type SortKey = "price" | "driverRating" | "vehicleRating" | "response";

function parseLanguages(raw?: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.join(" · ").toUpperCase();
  } catch {
    /* ignore */
  }
  return raw;
}

function firstPhoto(photoUrls?: string): string | null {
  if (!photoUrls) return null;
  try {
    const parsed = JSON.parse(photoUrls);
    if (Array.isArray(parsed) && parsed[0]) return String(parsed[0]);
  } catch {
    /* ignore */
  }
  return null;
}

export function OfferCards({
  tripId,
  offers,
  canAccept,
}: {
  tripId: string;
  offers: OfferCardData[];
  canAccept: boolean;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("price");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...offers];
    list.sort((a, b) => {
      if (sort === "price") return a.priceAmount - b.priceAmount;
      if (sort === "driverRating")
        return (b.driver.ratingAvg ?? 0) - (a.driver.ratingAvg ?? 0);
      if (sort === "vehicleRating")
        return (b.vehicle?.ratingAvg ?? 0) - (a.vehicle?.ratingAvg ?? 0);
      return (a.driver.avgResponseTimeMinutes ?? 99) - (b.driver.avgResponseTimeMinutes ?? 99);
    });
    return list;
  }, [offers, sort]);

  async function accept(offerId: string) {
    setLoadingId(offerId);
    setError(null);
    const result = await acceptOfferAction(tripId, offerId);
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(result.next || `/pedidos/${tripId}/pagamento`);
    router.refresh();
  }

  return (
    <div>
      <div className="page-head" style={{ marginBottom: "1rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.45rem", margin: 0 }}>
          Propostas para si
        </h2>
        <select
          className="select"
          style={{ width: "auto", minWidth: 200 }}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Ordenar propostas"
        >
          <option value="price">Menor preço</option>
          <option value="driverRating">Melhor motorista</option>
          <option value="vehicleRating">Melhor veículo</option>
          <option value="response">Resposta mais rápida</option>
        </select>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ display: "grid", gap: "1rem" }}>
        {sorted.map((offer) => {
          const elite = isMovioElite(offer.driver);
          const driverPhoto =
            offer.driver.photoUrl ||
            offer.driver.image ||
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop";
          const vehiclePhoto =
            firstPhoto(offer.vehicle?.photoUrls) ||
            "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=300&fit=crop";

          return (
            <article key={offer.id} className="card-interactive fade-up">
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "minmax(0, 1fr)",
                }}
                className="offer-card-grid"
              >
                <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={driverPhoto}
                    alt={offer.driver.name}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                      <strong style={{ fontSize: "1.05rem" }}>{offer.driver.name}</strong>
                      {elite && <span className="badge">Movio Elite</span>}
                    </div>
                    <div className="profile-meta" style={{ marginTop: "0.35rem" }}>
                      {offer.driver.ratingAvg != null && (
                        <span>
                          ★ {offer.driver.ratingAvg.toFixed(1)}
                          {offer.driver.ratingCount ? ` (${offer.driver.ratingCount})` : ""}
                        </span>
                      )}
                      {offer.driver.yearsOfExperience != null && (
                        <span>{offer.driver.yearsOfExperience} anos</span>
                      )}
                      {offer.driver.completedTripsCount != null && (
                        <span>{offer.driver.completedTripsCount} viagens</span>
                      )}
                      {offer.driver.avgResponseTimeMinutes != null && (
                        <span>~{Math.round(offer.driver.avgResponseTimeMinutes)} min resposta</span>
                      )}
                    </div>
                    {parseLanguages(offer.driver.languagesSpoken) && (
                      <div className="muted" style={{ marginTop: "0.35rem", fontSize: "0.86rem" }}>
                        {parseLanguages(offer.driver.languagesSpoken)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.85rem", alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vehiclePhoto}
                    alt={offer.vehicle ? `${offer.vehicle.make} ${offer.vehicle.model}` : "Veículo"}
                    style={{
                      width: 96,
                      height: 64,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <div>
                      <strong>
                        {offer.vehicle
                          ? `${offer.vehicle.make} ${offer.vehicle.model}`
                          : "Veículo"}
                      </strong>
                    </div>
                    <div className="muted" style={{ fontSize: "0.88rem" }}>
                      {offer.vehicle?.className || ""}
                      {offer.vehicle?.year ? ` · ${offer.vehicle.year}` : ""}
                      {offer.vehicle?.ratingAvg != null
                        ? ` · ★ ${offer.vehicle.ratingAvg.toFixed(1)} veículo`
                        : ""}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    borderTop: "1px solid var(--line)",
                    paddingTop: "0.85rem",
                  }}
                >
                  <div>
                    <div className="step-num" style={{ margin: 0 }}>
                      {formatMoney(offer.priceAmount, offer.currency)}
                    </div>
                    {offer.estimatedArrivalMinutes != null && (
                      <div className="muted" style={{ fontSize: "0.86rem" }}>
                        Chegada estimada ~{offer.estimatedArrivalMinutes} min
                      </div>
                    )}
                    {offer.message && (
                      <p style={{ margin: "0.45rem 0 0", fontSize: "0.92rem" }}>{offer.message}</p>
                    )}
                  </div>
                  <div className="cta-row">
                    {offer.driver.profileId && (
                      <Link
                        href={`/motoristas/${offer.driver.profileId}`}
                        className="btn btn-ghost btn-sm"
                      >
                        Perfil
                      </Link>
                    )}
                    {offer.vehicle && (
                      <Link href={`/veiculos/${offer.vehicle.id}`} className="btn btn-ghost btn-sm">
                        Veículo
                      </Link>
                    )}
                    {canAccept && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={loadingId === offer.id}
                        onClick={() => accept(offer.id)}
                      >
                        {loadingId === offer.id ? "A confirmar…" : "Escolher"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
