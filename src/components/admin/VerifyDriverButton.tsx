"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { verifyDriverAction } from "@/actions/marketplace";

export function VerifyDriverButton({ driverProfileId }: { driverProfileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(approve: boolean) {
    setLoading(true);
    await verifyDriverAction(driverProfileId, approve);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="form-actions">
      <button className="btn btn-primary" disabled={loading} onClick={() => act(true)}>
        Aprovar
      </button>
      <button className="btn btn-danger" disabled={loading} onClick={() => act(false)}>
        Recusar
      </button>
    </div>
  );
}
