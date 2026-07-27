"use client";

import { useTransition } from "react";
import { refreshWeeklyReportAction } from "@/actions/mel";
import { useRouter } from "next/navigation";

export function RefreshReportButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshWeeklyReportAction();
          router.refresh();
        })
      }
    >
      {pending ? "A actualizar…" : "Actualizar relatório"}
    </button>
  );
}
