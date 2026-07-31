"use client";

import { useActionState } from "react";
import type { DiamondProposal } from "@prisma/client";
import {
  updateDiamondStatusAction,
  convertDiamondProposalAction,
} from "@/actions/diamond";
import type { ActionState } from "@/actions/auth";
import { DIAMOND_STATUS_LABELS } from "@/config/plans";

const initial: ActionState = {};

export function DiamondAdminActions({
  proposal,
}: {
  proposal: DiamondProposal;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateDiamondStatusAction,
    initial,
  );
  const [convertState, convertAction, convertPending] = useActionState(
    convertDiamondProposalAction,
    initial,
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {(statusState.error || convertState.error) && (
        <div className="alert alert-error">{statusState.error || convertState.error}</div>
      )}
      {(statusState.success || convertState.success) && (
        <div className="alert alert-success">{statusState.success || convertState.success}</div>
      )}

      <form action={statusAction} className="panel" style={{ padding: "1rem" }}>
        <input type="hidden" name="id" value={proposal.id} />
        <div className="field">
          <label className="label" htmlFor={`status-${proposal.id}`}>
            Estado
          </label>
          <select
            className="input"
            id={`status-${proposal.id}`}
            name="status"
            defaultValue={proposal.status}
          >
            {Object.entries(DIAMOND_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor={`notes-${proposal.id}`}>
            Notas internas
          </label>
          <textarea
            className="input"
            id={`notes-${proposal.id}`}
            name="adminNotes"
            rows={2}
            defaultValue={proposal.adminNotes || ""}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={statusPending}>
          {statusPending ? "A guardar…" : "Atualizar estado"}
        </button>
      </form>

      {proposal.status === "ACCEPTED" && !proposal.convertedPlanId && (
        <form action={convertAction} className="panel" style={{ padding: "1rem" }}>
          <h3 style={{ marginTop: 0, fontSize: "1.05rem" }}>
            Transformar em subscrição personalizada
          </h3>
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="customerEmail" value={proposal.email} />

          <div className="field">
            <label className="label" htmlFor={`price-${proposal.id}`}>
              Valor mensal (€) *
            </label>
            <input
              className="input"
              id={`price-${proposal.id}`}
              name="priceEuros"
              type="number"
              min={1}
              step="0.01"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`mins-${proposal.id}`}>
              Minutos incluídos *
            </label>
            <input
              className="input"
              id={`mins-${proposal.id}`}
              name="monthlyMinutes"
              type="number"
              min={1}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`cond-${proposal.id}`}>
              Condições especiais
            </label>
            <textarea className="input" id={`cond-${proposal.id}`} name="specialConditions" rows={2} />
          </div>
          <div className="field">
            <label className="label" htmlFor={`ren-${proposal.id}`}>
              Data de renovação / início
            </label>
            <input className="input" id={`ren-${proposal.id}`} name="renewalDate" type="date" />
          </div>
          <div className="field">
            <label className="label" htmlFor={`int-${proposal.id}`}>
              Observações internas
            </label>
            <textarea className="input" id={`int-${proposal.id}`} name="internalNotes" rows={2} />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="activateNow" defaultChecked />
            <span>Ativar subscrição agora (cria conta se necessário)</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={convertPending}>
            {convertPending ? "A converter…" : "Criar plano personalizado"}
          </button>
        </form>
      )}
    </div>
  );
}
