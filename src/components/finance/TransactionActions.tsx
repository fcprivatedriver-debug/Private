"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
      {pending ? "…" : "Eliminar"}
    </button>
  );
}
