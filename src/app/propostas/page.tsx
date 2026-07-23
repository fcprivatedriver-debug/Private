import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { OFFER_STATUS_LABELS } from "@/config/constants";
import { WithdrawButton } from "@/components/offer/WithdrawButton";

export default async function MyOffersPage() {
  const session = await requireRole("DRIVER");
  const offers = await prisma.offer.findMany({
    where: { driverId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { tripRequest: true, vehicle: true },
  });

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          As minhas propostas
        </h1>
        <div className="list-stack" style={{ marginTop: "1.25rem" }}>
          {offers.map((offer) => (
            <div key={offer.id} className="list-item">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <Link href={`/pedidos/${offer.tripRequestId}`}>
                  <strong>{formatMoney(offer.priceAmount)}</strong>
                </Link>
                <span className="badge">{OFFER_STATUS_LABELS[offer.status]}</span>
              </div>
              <div className="muted">
                {offer.tripRequest.pickupAddress} → {offer.tripRequest.dropoffAddress}
              </div>
              {offer.status === "PENDING" && <WithdrawButton offerId={offer.id} />}
            </div>
          ))}
          {offers.length === 0 && <div className="panel muted">Ainda não enviaste propostas.</div>}
        </div>
      </div>
    </section>
  );
}
