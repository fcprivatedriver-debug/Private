"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptOfferAction,
  cancelTripAction,
  publishTripAction,
} from "@/actions/marketplace";
import { formatMoney } from "@/lib/money";

type BookingInfo = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  platformFeeAmount: number;
  payment?: { status: string; provider: string } | null;
} | null;

export function TripActions({
  tripId,
  status,
  acceptOfferId,
  booking,
}: {
  tripId: string;
  status: string;
  acceptOfferId?: string;
  booking?: BookingInfo;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setLoading(true);
    setError(null);
    const result = await action();
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Erro");
      return;
    }
    router.refresh();
  }

  if (acceptOfferId) {
    return (
      <div style={{ marginTop: "0.75rem" }}>
        {error && <div className="alert alert-error">{error}</div>}
        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => run(() => acceptOfferAction(tripId, acceptOfferId))}
        >
          {loading ? "A aceitar…" : "Escolher esta proposta"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {error && <div className="alert alert-error">{error}</div>}
      {booking && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3 className="font-display" style={{ marginTop: 0 }}>
            Reserva
          </h3>
          <p>
            Total {formatMoney(booking.totalAmount, booking.currency)} · taxa Movio{" "}
            {formatMoney(booking.platformFeeAmount, booking.currency)}
          </p>
          <p className="muted">
            Estado: {booking.status}
            {booking.payment ? ` · pagamento ${booking.payment.status}` : ""}
          </p>
          <div className="alert alert-info" style={{ marginBottom: 0 }}>
            Pagamentos seguros em breve (Stripe Connect preparado).
          </div>
        </div>
      )}
      <div className="form-actions">
        {status === "DRAFT" && (
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => run(() => publishTripAction(tripId))}
          >
            Publicar
          </button>
        )}
        {!["COMPLETED", "CANCELLED", "EXPIRED"].includes(status) && (
          <button
            className="btn btn-danger"
            disabled={loading}
            onClick={() => run(() => cancelTripAction(tripId))}
          >
            Cancelar pedido
          </button>
        )}
      </div>
    </div>
  );
}
