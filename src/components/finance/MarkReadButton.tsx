"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAlertRead } from "@/actions/finance";

export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await markAlertRead(id);
          router.refresh();
        });
      }}
    >
      Marcar lido
    </button>
  );
}
