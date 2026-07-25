"use client";

import { useState } from "react";
import { DeleteTransactionButton } from "@/components/finance/TransactionActions";
import { Panel } from "@/components/ui/FinanceUI";

/**
 * Ficha de um movimento já existente: Editar / Eliminar.
 * O formulário só aparece depois de tocar em ✏️ Editar — e usa update (não create).
 */
export function MovementFichaActions({
  id,
  kind,
  canEdit,
  children,
}: {
  id: string;
  kind: "expense" | "income";
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  if (!canEdit) {
    return (
      <Panel title="Sem permissão">
        <p className="muted" style={{ marginTop: 0 }}>
          Só podes editar os teus movimentos, a menos que a Conta Familiar permita editar uns dos
          outros.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <Panel title="Ações">
        <p className="muted small" style={{ marginTop: 0 }}>
          Altera este movimento (não cria um novo) ou elimina-o.
        </p>
        <div className="btn-row movement-ficha-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setEditing(true)}
            aria-expanded={editing}
          >
            ✏️ Editar
          </button>
          <DeleteTransactionButton
            id={id}
            kind={kind}
            label="🗑️ Eliminar"
            className="btn btn-ghost text-expense"
          />
        </div>
      </Panel>

      {editing ? (
        <Panel title="Editar movimento">
          <p className="muted small" style={{ marginTop: 0 }}>
            Guarda para atualizar saldo, dashboard, gráficos e estatísticas — sem duplicar.
          </p>
          {children}
        </Panel>
      ) : null}
    </>
  );
}
