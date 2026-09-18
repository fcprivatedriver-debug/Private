import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getLocale } from "next-intl/server";
import { DriverHubTabs } from "@/components/driver/DriverHubTabs";
import { TripRequestCard } from "@/components/trip/TripRequestCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { localizeVehicleClass } from "@/domain/vehicle-class";

type Search = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default async function OpenTripsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await requireRole("DRIVER");
  const locale = await getLocale();
  const sp = await searchParams;

  const sort = one(sp.sort) || "date";
  const classId = one(sp.class);
  const withoutOffer = one(sp.withoutOffer) === "1";
  const q = one(sp.q).trim().toLowerCase();

  const classes = await prisma.vehicleClass.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });

  const trips = await prisma.tripRequest.findMany({
    where: {
      status: "OPEN",
      ...(classId ? { preferredVehicleClassId: classId } : {}),
    },
    orderBy:
      sort === "newest"
        ? { createdAt: "desc" }
        : sort === "distance"
          ? { distanceMeters: "asc" }
          : { pickupAt: "asc" },
    include: {
      preferredVehicleClass: true,
      offers: {
        where: { driverId: session.user.id },
        select: { id: true, status: true },
        take: 1,
      },
    },
  });

  let filtered = trips;
  if (withoutOffer) {
    filtered = filtered.filter((t) => t.offers.length === 0);
  }
  if (q) {
    filtered = filtered.filter(
      (t) =>
        t.pickupAddress.toLowerCase().includes(q) ||
        t.dropoffAddress.toLowerCase().includes(q),
    );
  }
  // "Pedidos novos" / without treating already-offered as fresh: default list still
  // shows offered trips but cards mark "Proposta enviada". Optional filter hides them.

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <DriverHubTabs active="pedidos" />
        <h1 className="page-title" style={{ marginTop: "1rem" }}>
          Pedidos
        </h1>
        <p className="lead">Escolha um trajeto e envie a sua proposta.</p>

        <form className="trip-filters" method="get">
          <input
            className="input"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Origem ou destino"
            aria-label="Filtrar por origem ou destino"
          />
          <select className="select" name="class" defaultValue={classId} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {localizeVehicleClass(c, locale).name}
              </option>
            ))}
          </select>
          <select className="select" name="sort" defaultValue={sort} aria-label="Ordenar">
            <option value="date">Data da viagem</option>
            <option value="newest">Pedidos mais recentes</option>
            <option value="distance">Distância do trajeto</option>
            {/* Proximity-to-driver reserved until driver geolocation exists */}
          </select>
          <label className="trip-filter-check">
            <input type="checkbox" name="withoutOffer" value="1" defaultChecked={withoutOffer} />
            Sem a minha proposta
          </label>
          <button type="submit" className="btn btn-secondary btn-sm">
            Aplicar
          </button>
        </form>

        <div className="trip-card-stack">
          {filtered.map((trip) => (
            <TripRequestCard
              key={trip.id}
              locale={locale}
              trip={{
                id: trip.id,
                pickupAddress: trip.pickupAddress,
                dropoffAddress: trip.dropoffAddress,
                pickupAt: trip.pickupAt,
                passengers: trip.passengers,
                luggage: trip.luggage,
                distanceMeters: trip.distanceMeters,
                durationSeconds: trip.durationSeconds,
                flightNumber: trip.flightNumber,
                className: trip.preferredVehicleClass
                  ? localizeVehicleClass(trip.preferredVehicleClass, locale).name
                  : null,
                myOfferId: trip.offers[0]?.id ?? null,
                myOfferStatus: trip.offers[0]?.status ?? null,
              }}
            />
          ))}
          {filtered.length === 0 && (
            <EmptyState
              title="Sem pedidos para estes filtros"
              body="Assim que um cliente publicar um trajeto compatível, aparece aqui."
            />
          )}
        </div>

        <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
          <Link href="/propostas">Ver as minhas propostas →</Link>
        </p>
      </div>
    </section>
  );
}
