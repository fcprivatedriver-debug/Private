"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteExpense, deleteIncome } from "@/actions/finance";

const DELETE_CONFIRM = "Tem a certeza que pretende eliminar este movimento?";

export function DeleteTransactionButton({
  id,
  kind,
  label = "Eliminar",
}: {
  id: string;
  kind: "expense" | "income";
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm text-expense"
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(DELETE_CONFIRM)) return;
        start(async () => {
          const res =
            kind === "expense" ? await deleteExpense(id) : await deleteIncome(id);
          if (res && "ok" in res && !res.ok) {
            alert(res.error);
            return;
          }
          router.push(kind === "expense" ? "/pt/despesas" : "/pt/receitas");
          router.refresh();
        });
      }}
    >
      {pending ? "…" : label}
    </button>
  );
}

/** Inline Editar / Eliminar on list rows. */
export function TransactionRowActions({
  id,
  kind,
}: {
  id: string;
  kind: "expense" | "income";
}) {
  const href = kind === "expense" ? `/pt/despesas/${id}` : `/pt/receitas/${id}`;

  return (
    <div className="tx-row-actions" onClick={(e) => e.stopPropagation()}>
      <Link href={href} className="btn btn-ghost btn-sm" prefetch={false}>
        ✏️ Editar
      </Link>
      <DeleteTransactionButton id={id} kind={kind} label="🗑️ Eliminar" />
    </div>
  );
}
