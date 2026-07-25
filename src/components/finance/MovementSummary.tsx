import { formatEUR } from "@/lib/money";

/** Resumo do movimento aberto na ficha (só leitura). */
export function MovementSummary({
  kind,
  description,
  amountCents,
  date,
  categoryName,
  scope,
  accountName,
}: {
  kind: "expense" | "income";
  description: string;
  amountCents: number;
  date: Date;
  categoryName: string;
  scope: "PERSONAL" | "FAMILY";
  accountName?: string | null;
}) {
  const signed =
    kind === "income" ? `+${formatEUR(amountCents)}` : `−${formatEUR(amountCents)}`;

  return (
    <div className="movement-summary">
      <div className="movement-summary-top">
        <strong>{description}</strong>
        <span className={kind === "income" ? "amount-income" : "amount-expense"}>{signed}</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {date.toLocaleDateString("pt-PT")} · {categoryName} ·{" "}
        {scope === "FAMILY" ? "Familiar" : "Pessoal"}
        {accountName ? ` · ${accountName}` : ""}
      </p>
    </div>
  );
}
