"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  cancelTripAction,
  publishTripAction,
  startTripAction,
  completeTripAction,
  advanceJourneyAction,
} from "@/actions/marketplace";
import { formatMoney } from "@/lib/money";
import { Link } from "@/i18n/navigation";

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
  booking,
  canManageJourney,
  canCancel = true,
  isCustomer = false,
}: {
  tripId: string;
  status: string;
  booking?: BookingInfo;
  canManageJourney?: boolean;
  canCancel?: boolean;
  isCustomer?: boolean;
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

  const needsPayment =
    booking &&
    (booking.status === "PENDING_PAYMENT" || status === "OFFER_ACCEPTED") &&
    booking.payment?.status !== "CAPTURED";

  const paid =
    booking &&
    (booking.payment?.status === "CAPTURED" ||
      booking.status === "PAID" ||
      booking.status === "COMPLETED");

  return (
    <div style={{ marginTop: "1rem" }}>
      {error && <div className="alert alert-error">{error}</div>}
      {booking && (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <h3 className="font-display" style={{ marginTop: 0 }}>
            Reserva
          </h3>
          <p style={{ marginBottom: "0.35rem" }}>
            Total {formatMoney(booking.totalAmount, booking.currency)}
          </p>
          {paid ? (
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              Pagamento confirmado. A sua viagem está reservada.
            </div>
          ) : needsPayment && isCustomer ? (
            <div className="cta-row" style={{ marginTop: "0.75rem" }}>
              <Link href={`/pedidos/${tripId}/pagamento`} className="btn btn-primary">
                Continuar para pagamento
              </Link>
            </div>
          ) : needsPayment ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              A aguardar confirmação de pagamento do cliente.
            </p>
          ) : null}
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
        {canManageJourney && status === "CONFIRMED" && (
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => run(() => advanceJourneyAction(tripId, "DRIVER_EN_ROUTE"))}
          >
            Motorista a caminho
          </button>
        )}
        {canManageJourney && status === "DRIVER_EN_ROUTE" && (
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => run(() => advanceJourneyAction(tripId, "DRIVER_ARRIVED"))}
          >
            Motorista chegou
          </button>
        )}
        {canManageJourney && ["CONFIRMED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED"].includes(status) && (
          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => run(() => startTripAction(tripId))}
          >
            Iniciar viagem
          </button>
        )}
        {canManageJourney &&
          ["CONFIRMED", "DRIVER_EN_ROUTE", "DRIVER_ARRIVED", "IN_PROGRESS"].includes(status) && (
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => run(() => completeTripAction(tripId))}
            >
              Concluir viagem
            </button>
          )}
        {canCancel && !["COMPLETED", "CANCELLED", "EXPIRED"].includes(status) && (
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
