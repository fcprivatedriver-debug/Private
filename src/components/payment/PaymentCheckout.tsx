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

  async function confirmDemo() {
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
        <div style={{ fontWeight: 600, marginBottom: "0.65rem" }}>Cartão</div>
        {stripeReady && clientSecret ? (
          <p className="muted" style={{ margin: 0 }}>
            Stripe Elements pronto. Client secret recebido — finalize com o formulário Stripe em
            produção.
          </p>
        ) : (
          <>
            <div className="field" style={{ marginBottom: "0.65rem" }}>
              <label className="label" htmlFor="card">
                Número do cartão
              </label>
              <input
                className="input"
                id="card"
                name="card"
                defaultValue="4242 4242 4242 4242"
                readOnly
              />
            </div>
            <div className="grid-2" style={{ gap: "0.65rem" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="exp">
                  Validade
                </label>
                <input className="input" id="exp" defaultValue="12 / 28" readOnly />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="cvc">
                  CVC
                </label>
                <input className="input" id="cvc" defaultValue="123" readOnly />
              </div>
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", margin: "0.75rem 0 0" }}>
              Modo Sandbox / Teste — nenhum dinheiro real é movimentado. Para Stripe (test ou
              live €1), defina <code>PAYMENTS_ENABLED=true</code> e as chaves Stripe.
            </p>
          </>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button className="btn btn-primary" type="button" disabled={loading} onClick={confirmDemo}>
        {loading ? "A confirmar…" : "Confirmar pagamento (Sandbox)"}
      </button>
      <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.85rem", marginBottom: 0 }}>
        Pagamento em modo teste. A reserva confirma-se de seguida e os emails ficam na caixa demo.
      </p>
    </div>
  );
}
