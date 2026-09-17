"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  /** URL interna existente (/api/uploads/...) — nunca mostrar como campo editável */
  existingImageUrl?: string | null;
  existingPdfUrl?: string | null;
  onFileChange?: (file: File | null) => void;
};

/**
 * Anexar fatura — câmara / galeria / PDF.
 * O utilizador nunca introduz URLs.
 */
export function ReceiptAttachField({ existingImageUrl, existingPdfUrl, onFileChange }: Props) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const existingUrl = !removeExisting ? existingImageUrl || existingPdfUrl || null : null;
  const existingIsPdf = Boolean(existingPdfUrl && !removeExisting);
  const existingName = existingUrl
    ? existingUrl.split("/").pop()?.replace(/^\d+-[\w-]+-/, "") || "Fatura anexada"
    : null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Injeta o ficheiro no FormData do <form> pai no submit
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onFormData = (ev: FormDataEvent) => {
      if (fileRef.current) {
        ev.formData.set("receiptFile", fileRef.current);
      }
    };
    form.addEventListener("formdata", onFormData);
    return () => form.removeEventListener("formdata", onFormData);
  }, []);

  function acceptFile(next: File | null) {
    setPickerError(null);
    if (!next) return;
    const okTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (next.type && !okTypes.includes(next.type) && !/\.(jpe?g|png|webp|pdf)$/i.test(next.name)) {
      setPickerError("Formato não suportado. Usa JPEG, PNG, WEBP ou PDF.");
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setPickerError("Ficheiro demasiado grande (máx. 5 MB).");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    fileRef.current = next;
    setFile(next);
    setRemoveExisting(true);
    setPreviewUrl(next.type.startsWith("image/") ? URL.createObjectURL(next) : null);
    onFileChange?.(next);
  }

  function clearSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    fileRef.current = null;
    setFile(null);
    setPreviewUrl(null);
    setPickerError(null);
    onFileChange?.(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
  }

  return (
    <div className="receipt-attach" ref={rootRef}>
      <p className="field-label" id={inputId}>
        Anexar fatura
      </p>
      <p className="muted small" style={{ marginTop: 0 }}>
        Opcional — tira uma fotografia ou escolhe uma imagem/PDF.
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
      />
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
      />

      {removeExisting ? <input type="hidden" name="removeReceipt" value="1" /> : null}
      {!file && !removeExisting && existingImageUrl ? (
        <input type="hidden" name="receiptImageUrl" value={existingImageUrl} />
      ) : null}
      {!file && !removeExisting && existingPdfUrl ? (
        <input type="hidden" name="receiptPdfUrl" value={existingPdfUrl} />
      ) : null}

      <div className="btn-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => cameraRef.current?.click()}>
          Tirar fotografia
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => galleryRef.current?.click()}>
          Escolher fotografia
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => pdfRef.current?.click()}>
          Escolher PDF/ficheiro
        </button>
      </div>

      {pickerError ? <p className="form-error">{pickerError}</p> : null}

      {file ? (
        <div className="receipt-preview panel" style={{ marginTop: "0.75rem", padding: "0.75rem" }}>
          <strong className="small">{file.name}</strong>
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
          <div className="btn-row" style={{ marginTop: "0.5rem" }}>
            {previewUrl ? (
              <a className="btn btn-ghost btn-sm" href={previewUrl} target="_blank" rel="noreferrer">
                Ver
              </a>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection}>
              Remover
            </button>
          </div>
        </div>
      ) : existingUrl ? (
        <div className="receipt-preview panel" style={{ marginTop: "0.75rem", padding: "0.75rem" }}>
          <strong className="small">Fatura anexada</strong>
          <p className="muted small" style={{ margin: "0.25rem 0" }}>
            {existingName}
            {existingIsPdf ? " · PDF" : " · Imagem"}
          </p>
          <div className="btn-row">
            <a className="btn btn-ghost btn-sm" href={existingUrl} target="_blank" rel="noreferrer">
              Ver fatura
            </a>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setRemoveExisting(true);
                clearSelection();
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
