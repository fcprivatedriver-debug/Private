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
    <form onSubmit={onSubmit} className="panel" style={{ marginTop: "1rem" }}>
      <h3 className="font-display" style={{ marginTop: 0 }}>
        Avaliar motorista
      </h3>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field">
        <label className="label" htmlFor="rating">
          Classificação
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
        <label className="label" htmlFor="comment">
          Comentário
        </label>
        <textarea className="textarea" id="comment" name="comment" placeholder="Como correu a viagem?" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "A enviar…" : "Enviar avaliação"}
      </button>
    </form>
  );
}
