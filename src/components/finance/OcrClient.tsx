"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { runOcrPreview, confirmOcrExpense } from "@/actions/finance";
import type { PaymentMethod } from "@prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

type Cat = { id: string; name: string; slug: string };
type Acc = { id: string; name: string };

const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Fotografar / carregar fatura.
 * Sem motor OCR real: guarda a imagem e pede introdução manual — nunca preenche totais inventados.
 */
export function OcrClient({
  categories,
  accounts,
}: {
  categories: Cat[];
  accounts: Acc[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("DEBIT_CARD");
  const [accountId, setAccountId] = useState("");

  function acceptFile(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    if (
      file.type &&
      !OK_TYPES.includes(file.type) &&
      !/\.(jpe?g|png|webp|pdf)$/i.test(file.name)
    ) {
      setError("Formato não suportado. Usa JPEG, PNG, WEBP ou PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ficheiro demasiado grande (máx. 5 MB).");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setFileLabel(file.name);

    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await runOcrPreview(fd);
      if (res.ok) {
        // Motor OCR real futuro — ainda assim o utilizador confirma no formulário.
        setReceiptUrl(res.receiptUrl);
        setManualOpen(true);
        setStoreName(res.result.storeName || "");
        setDate(res.result.date || new Date().toISOString().slice(0, 10));
        setAmount(
          res.result.totalCents > 0
            ? (res.result.totalCents / 100).toFixed(2).replace(".", ",")
            : "",
        );
        setVat(
          res.result.vatCents > 0
            ? (res.result.vatCents / 100).toFixed(2).replace(".", ",")
            : "",
        );
        const cat = categories.find((c) => c.slug === res.result.suggestedCategorySlug);
        if (cat) setCategoryId(cat.id);
        setMessage("Confirma os dados lidos da fatura antes de guardar.");
        return;
      }

      // Sem OCR: fatura guardada — formulário manual vazio (nunca valores inventados).
      if (res.receiptUrl) {
        setReceiptUrl(res.receiptUrl);
        setManualOpen(true);
        setStoreName("");
        setAmount("");
        setVat("");
        setDate(new Date().toISOString().slice(0, 10));
        setMessage(
          res.error ||
            "A leitura automática ainda não está disponível. Introduz os dados manualmente — a fatura já está guardada.",
        );
        return;
      }
      setReceiptUrl(null);
      setManualOpen(false);
      setError(res.error || "Não foi possível guardar a fatura.");
    });
  }

  return (
    <div className="stack-lg">
      <div>
        <p className="field-label">Fotografar / carregar fatura</p>
        <p className="muted small" style={{ marginTop: 0 }}>
          JPEG, PNG, WEBP ou PDF · máx. 5 MB
        </p>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            acceptFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            acceptFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <input
          ref={pdfRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            acceptFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <div className="btn-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() => cameraRef.current?.click()}
          >
            {pending ? "A guardar…" : "Tirar fotografia"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => galleryRef.current?.click()}
          >
            Escolher fotografia
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => pdfRef.current?.click()}
          >
            Escolher PDF
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="muted">{message}</p> : null}

      {fileLabel ? (
        <div className="receipt-preview panel" style={{ padding: "0.75rem" }}>
          <strong className="small">{fileLabel}</strong>
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Pré-visualização da fatura"
              style={{ display: "block", maxWidth: "100%", marginTop: "0.5rem", borderRadius: 8 }}
            />
          ) : (
            <p className="muted small">Documento PDF seleccionado.</p>
          )}
          {receiptUrl ? (
            <p className="muted small" style={{ marginBottom: 0 }}>
              Guardada ·{" "}
              <a href={receiptUrl} target="_blank" rel="noreferrer">
                ver ficheiro
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {manualOpen ? (
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const totalCents = Math.round(
                Number(amount.replace(/\./g, "").replace(",", ".")) * 100,
              );
              const vatCents = Math.round(
                Number((vat || "0").replace(/\./g, "").replace(",", ".")) * 100,
              );
              if (!Number.isFinite(totalCents) || totalCents <= 0) {
                setError("Indica o valor total da fatura.");
                return;
              }
              const res = await confirmOcrExpense({
                storeName,
                date,
                totalCents,
                vatCents: Number.isFinite(vatCents) ? vatCents : 0,
                categoryId,
                description: storeName ? `Fatura ${storeName}` : "Fatura",
                paymentMethod,
                accountId: accountId || null,
                receiptUrl,
                items: [],
              });
              if (res.ok) {
                router.push("/pt/despesas");
                router.refresh();
              } else {
                setError(res.error);
              }
            });
          }}
        >
          <label className="field">
            <span>Loja</span>
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex: Continente"
            />
          </label>
          <label className="field">
            <span>Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            <span>Valor total (€)</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>
          <label className="field">
            <span>IVA (€) — opcional</span>
            <input
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              inputMode="decimal"
              placeholder="0,00"
            />
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
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
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Conta</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar despesa com fatura"}
          </button>
        </form>
      ) : (
        <p className="muted">
          Fotografa ou escolhe a fatura para a guardar. Depois podes introduzir o valor manualmente.
          {" "}
          <Link href="/pt/despesas/nova">Ir directamente a Nova despesa</Link>
        </p>
      )}
    </div>
  );
}
