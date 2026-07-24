"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { confirmPaymentAction } from "@/actions/marketplace";
import { formatMoney } from "@/lib/money";

export function PaymentCheckout({
  bookingId,
  tripId,
  totalAmount,
  currency,
  stripeReady,
  clientSecret,
}: {
  bookingId: string;
  tripId: string;
  totalAmount: number;
  currency: string;
  stripeReady: boolean;
  clientSecret?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmPayment() {
    setLoading(true);
    setError(null);
    const result = await confirmPaymentAction(bookingId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(result.next || `/pedidos/${tripId}/confirmacao`);
    router.refresh();
  }

  return (
    <div className="panel panel-lift">
      <div className="label-sm" style={{ marginBottom: "0.35rem" }}>
        Valor da viagem
      </div>
      <div className="step-num" style={{ margin: "0 0 1rem" }}>
        {formatMoney(totalAmount, currency)}
      </div>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 14,
          padding: "1rem",
          marginBottom: "1rem",
          background: "var(--surface-2)",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "0.65rem" }}>Pagamento</div>
        {stripeReady && clientSecret ? (
          <p className="muted" style={{ margin: 0 }}>
            Pagamento seguro preparado. Finalize com o formulário de cartão para confirmar a
            reserva.
          </p>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>
            Confirme o pagamento para garantir a reserva. Os contactos entre cliente e motorista
            ficam disponíveis após a confirmação.
          </p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button className="btn btn-primary" type="button" disabled={loading} onClick={confirmPayment}>
        {loading ? "A confirmar…" : "Confirmar pagamento"}
      </button>
      <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.85rem", marginBottom: 0 }}>
        Pagamento seguro. A reserva é confirmada de imediato após a validação.
      </p>
    </div>
  );
}
