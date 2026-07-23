"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createReviewAction } from "@/actions/marketplace";

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("bookingId", bookingId);
    const result = await createReviewAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="panel panel-lift" style={{ marginTop: "1rem" }}>
      <h3 className="font-display" style={{ marginTop: 0 }}>
        Avaliar a sua viagem
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        A sua opinião ajuda outros clientes a escolher com confiança.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="rating">
          Motorista
        </label>
        <select className="select" id="rating" name="rating" defaultValue="5" required>
          <option value="5">5 — Excelente</option>
          <option value="4">4 — Muito bom</option>
          <option value="3">3 — Bom</option>
          <option value="2">2 — Fraco</option>
          <option value="1">1 — Mau</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="vehicleRating">
          Veículo
        </label>
        <select className="select" id="vehicleRating" name="vehicleRating" defaultValue="5" required>
          <option value="5">5 — Impecável</option>
          <option value="4">4 — Muito bom</option>
          <option value="3">3 — Adequado</option>
          <option value="2">2 — Fraco</option>
          <option value="1">1 — Mau</option>
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="comment">
          Feedback (opcional)
        </label>
        <textarea
          className="textarea"
          id="comment"
          name="comment"
          placeholder="Como correu a viagem? Pontualidade, conforto, condução…"
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "A enviar…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
