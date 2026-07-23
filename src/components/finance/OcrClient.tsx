"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runOcrPreview, confirmOcrExpense } from "@/actions/finance";
import { formatEUR } from "@/lib/money";
import type { PaymentMethod } from "@prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

type Cat = { id: string; name: string; slug: string };
type Acc = { id: string; name: string };

export function OcrClient({
  categories,
  accounts,
}: {
  categories: Cat[];
  accounts: Acc[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof runOcrPreview>>["result"] | null>(null);
  const [storeName, setStoreName] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DEBIT_CARD");
  const [accountId, setAccountId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const suggested = useMemo(() => {
    if (!preview) return null;
    return categories.find((c) => c.slug === preview.suggestedCategorySlug);
  }, [preview, categories]);

  return (
    <div className="stack-lg">
      <label className="field">
        <span>Fotografar / carregar fatura</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            start(async () => {
              const res = await runOcrPreview(file.name);
              if (res.ok) {
                setPreview(res.result);
                setStoreName(res.result.storeName);
                setDate(res.result.date);
                setAmount((res.result.totalCents / 100).toFixed(2).replace(".", ","));
                setVat((res.result.vatCents / 100).toFixed(2).replace(".", ","));
                const cat = categories.find((c) => c.slug === res.result.suggestedCategorySlug);
                if (cat) setCategoryId(cat.id);
                setMessage(`Confiança OCR: ${Math.round(res.result.confidence * 100)}% — confirme os dados.`);
              }
            });
          }}
        />
      </label>

      {message ? <p className="muted">{message}</p> : null}

      {preview ? (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const totalCents = Math.round(
                Number(amount.replace(/\./g, "").replace(",", ".")) * 100,
              );
              const vatCents = Math.round(
                Number(vat.replace(/\./g, "").replace(",", ".")) * 100,
              );
              const res = await confirmOcrExpense({
                storeName,
                date,
                totalCents,
                vatCents,
                categoryId,
                description: `Fatura ${storeName}`,
                paymentMethod,
                accountId: accountId || null,
                items: preview.items,
              });
              if (res.ok) {
                router.push("/pt/despesas");
              }
            });
          }}
        >
          <label className="field">
            <span>Loja</span>
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Valor total (€)</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label className="field">
            <span>IVA (€)</span>
            <input value={vat} onChange={(e) => setVat(e.target.value)} />
          </label>
          <label className="field">
            <span>Categoria sugerida {suggested ? `(${suggested.name})` : ""}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Método</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Conta</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <div>
            <p className="muted small">Produtos reconhecidos</p>
            <ul>
              {preview.items.map((item) => (
                <li key={item.name}>
                  {item.name} × {item.quantity} — {formatEUR(item.totalCents)}
                </li>
              ))}
            </ul>
          </div>

          <button className="btn btn-primary" type="submit" disabled={pending}>
            Confirmar e guardar despesa
          </button>
        </form>
      ) : (
        <p className="muted">Carregue uma imagem ou PDF da fatura para iniciar o OCR.</p>
      )}
    </div>
  );
}
