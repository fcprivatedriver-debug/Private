"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteExpense, deleteIncome } from "@/actions/finance";

export function DeleteTransactionButton({
  id,
  kind,
}: {
  id: string;
  kind: "expense" | "income";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm text-expense"
      disabled={pending}
      onClick={() => {
        if (!confirm(kind === "expense" ? "Eliminar esta despesa?" : "Eliminar esta receita?")) return;
        start(async () => {
          if (kind === "expense") await deleteExpense(id);
          else await deleteIncome(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Eliminar"}
    </button>
  );
}

export function TransactionActions({
  id,
  kind,
}: {
  id: string;
  kind: "expense" | "income";
}) {
  const href = kind === "expense" ? `/pt/despesas/${id}` : `/pt/receitas/${id}`;
  return (
    <div className="row-actions">
      <Link href={href} className="btn btn-ghost btn-sm">
        Editar
      </Link>
      <DeleteTransactionButton id={id} kind={kind} />
    </div>
  );
}
