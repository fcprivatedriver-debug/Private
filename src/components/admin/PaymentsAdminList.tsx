"use client";

import { useTransition } from "react";
import { confirmDemoPaymentAction } from "@/actions/payments";
import { formatEuros } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/config/constants";
import type { PaymentStatus, PaymentMethodType, PaymentKind } from "@prisma/client";

type Payment = {
  id: string;
  amountCents: number;
  status: PaymentStatus;
  method: PaymentMethodType;
  kind: PaymentKind;
  createdAt: string;
  userName: string;
  userEmail: string;
};

export function PaymentsAdminList({ payments }: { payments: Payment[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="list-stack">
      {payments.map((p) => (
        <div key={p.id} className="list-item panel" style={{ cursor: "default" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <strong>{formatEuros(p.amountCents)}</strong>
              <div className="muted">
                {p.userName} · {p.userEmail}
              </div>
              <div className="muted" style={{ fontSize: "0.84rem" }}>
                {new Date(p.createdAt).toLocaleString("pt-PT")} · {PAYMENT_METHOD_LABELS[p.method]} · {p.kind}
              </div>
            </div>
            <span className={`badge ${p.status === "PAID" ? "badge-success" : "badge-warn"}`}>
              {PAYMENT_STATUS_LABELS[p.status]}
            </span>
          </div>
          {p.status === "PENDING" && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginTop: "0.5rem" }}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await confirmDemoPaymentAction(p.id);
                })
              }
            >
              Confirmar pagamento (demo)
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
