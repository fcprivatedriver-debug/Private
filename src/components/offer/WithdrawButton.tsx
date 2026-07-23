"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withdrawOfferAction } from "@/actions/marketplace";

export function WithdrawButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      className="btn btn-danger"
      style={{ marginTop: "0.5rem", padding: "0.45rem 0.9rem" }}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await withdrawOfferAction(offerId);
        setLoading(false);
        router.refresh();
      }}
    >
      {loading ? "…" : "Retirar"}
    </button>
  );
}
