"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmInvoiceExpense } from "@/actions/finance";
import { INVOICE_FIELD_CONFIDENCE_OK } from "@/domain/categories";

export type InvoiceAnalysisDraft = {
  supplier: string | null;
  total: number | null;
  currency: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  invoiceNumber: string | null;
  categorySlug: string | null;
  description: string | null;
  vat: number | null;
  confidence: {
    supplier: number;
    total: number;
    invoiceDate: number;
    dueDate: number;
    category: number;
  };
  readyToConfirm?: boolean;
};

type Cat = { id: string; name: string; slug: string };

function FieldStatus({
  ok,
  label,
  value,
  missing,
}: {
  ok: boolean;
  label: string;
  value: string;
  missing?: boolean;
}) {
  return (
    <div className={`invoice-field ${ok ? "is-ok" : "is-doubt"} ${missing ? "is-missing" : ""}`}>
      <span className="invoice-field-mark" aria-hidden>
        {missing ? "?" : ok ? "✓" : "?"}
      </span>
      <div>
        <strong className="invoice-field-label">{label}</strong>
        <div className="invoice-field-value">{value || "—"}</div>
      </div>
    </div>
  );
}

export function InvoiceConfirmPanel({
  receiptUrl,
  analysis,
  categories,
  onDismiss,
}: {
  receiptUrl: string;
  analysis: InvoiceAnalysisDraft;
  categories: Cat[];
  onDismiss?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const conf = analysis.confidence;
  const [supplier, setSupplier] = useState(analysis.supplier || "");
  const [total, setTotal] = useState(
    analysis.total != null ? analysis.total.toFixed(2).replace(".", ",") : "",
  );
  const [invoiceDate, setInvoiceDate] = useState(analysis.invoiceDate || "");
  const [dueDate, setDueDate] = useState(analysis.dueDate || "");
  const [categoryId, setCategoryId] = useState(() => {
    if (!analysis.categorySlug) return "";
    return categories.find((c) => c.slug === analysis.categorySlug)?.id || "";
  });
  const [description, setDescription] = useState(
    analysis.description || analysis.supplier || "",
  );

  const totalOk = conf.total >= INVOICE_FIELD_CONFIDENCE_OK && analysis.total != null;
  const supplierOk = conf.supplier >= INVOICE_FIELD_CONFIDENCE_OK && Boolean(analysis.supplier);
  const dateOk = conf.invoiceDate >= INVOICE_FIELD_CONFIDENCE_OK && Boolean(analysis.invoiceDate);
  const catOk = conf.category >= 0.7 && Boolean(analysis.categorySlug);
  const dueOk = conf.dueDate >= INVOICE_FIELD_CONFIDENCE_OK && Boolean(analysis.dueDate);
  const dueMissing = !analysis.dueDate || conf.dueDate < 0.5;

  const needsEdit = !(totalOk && dateOk && catOk && (supplierOk || description));

  function submit() {
    setError(null);
    const totalEuros = Number(total.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(totalEuros) || totalEuros <= 0) {
      setError("Indica o valor total a pagar.");
      return;
    }
    if (!invoiceDate) {
      setError("Indica a data da fatura.");
      return;
    }
    if (!categoryId) {
      setError("Escolhe uma categoria.");
      return;
    }
    start(async () => {
      const res = await confirmInvoiceExpense({
        receiptUrl,
        supplier: supplier.trim() || description.trim() || "Fatura",
        description: description.trim() || supplier.trim() || "Fatura",
        totalEuros,
        currency: analysis.currency || "EUR",
        invoiceDate,
        dueDate: dueDate || null,
        invoiceNumber: analysis.invoiceNumber,
        categoryId,
        vatEuros: analysis.vat,
        extractionJson: JSON.stringify(analysis),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedId(res.id);
      router.refresh();
    });
  }

  if (savedId) {
    return (
      <div className="captura-result invoice-confirm is-saved" role="status">
        <strong>Despesa guardada</strong>
        <span>A fatura ficou associada à despesa no espaço activo.</span>
        <span style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Link className="btn btn-primary btn-sm" href={`/pt/despesas/${savedId}`}>
            Ver despesa
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/pt/despesas">
            Lista de despesas
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="invoice-confirm panel">
      <div className="panel-body stack-md">
        <div>
          <strong>Fatura analisada</strong>
          <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
            Confirma os dados. Só os campos com dúvida precisam de ajuste.
          </p>
        </div>

        <div className="invoice-field-list">
          <FieldStatus
            ok={supplierOk}
            label="Fornecedor"
            value={analysis.supplier || "Não identificado"}
            missing={!analysis.supplier}
          />
          <FieldStatus
            ok={totalOk}
            label="Total a pagar"
            value={
              analysis.total != null
                ? `${analysis.total.toFixed(2).replace(".", ",")} ${analysis.currency || "EUR"}`
                : "Não identificado"
            }
            missing={analysis.total == null}
          />
          <FieldStatus
            ok={catOk}
            label="Categoria"
            value={
              categories.find((c) => c.slug === analysis.categorySlug)?.name ||
              analysis.categorySlug ||
              "Não identificada"
            }
            missing={!analysis.categorySlug}
          />
          <FieldStatus
            ok={dateOk}
            label="Data da fatura"
            value={analysis.invoiceDate || "Não identificada"}
            missing={!analysis.invoiceDate}
          />
          <FieldStatus
            ok={dueOk && !dueMissing}
            label="Vencimento"
            value={analysis.dueDate || "Não identificado"}
            missing={dueMissing}
          />
        </div>

        {(needsEdit || !analysis.readyToConfirm) && (
          <div className="form-grid" style={{ marginTop: "0.5rem" }}>
            <label className="field">
              <span>Fornecedor / descrição</span>
              <input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (!supplier) setSupplier(e.target.value);
                }}
                placeholder="Ex: EDP"
              />
            </label>
            <label className="field">
              <span>Total a pagar (€)</span>
              <input
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                required
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Escolher categoria…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Data da fatura</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Vencimento (opcional)</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
        )}

        {error ? (
          <p className="text-expense" role="alert">
            {error}
          </p>
        ) : null}

        <div className="btn-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pending}
            onClick={submit}
          >
            {pending ? "A guardar…" : "Confirmar e guardar"}
          </button>
          <Link
            className="btn btn-ghost"
            href={`/pt/despesas/nova?receipt=${encodeURIComponent(receiptUrl)}`}
          >
            Abrir formulário completo
          </Link>
          {onDismiss ? (
            <button type="button" className="btn btn-ghost" onClick={onDismiss} disabled={pending}>
              Fechar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
