"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getHouseholdSyncSnapshot } from "@/actions/nina";

/**
 * Polling leve (~6s) para sincronizar a Conta Familiar entre membros
 * sem websockets — refresca a UI quando há movimentos novos.
 */
export function HouseholdLiveSync({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter();
  const lastKey = useRef<string>("");
  const [, start] = useTransition();

  useEffect(() => {
    let alive = true;

    async function tick() {
      try {
        const res = await getHouseholdSyncSnapshot();
        if (!alive || !res.ok) return;
        const s = res.snapshot;
        const key = [
          s.expenseCount,
          s.incomeCount,
          s.lastExpense?.id ?? "",
          s.goals.map((g) => g.currentCents).join(","),
        ].join("|");
        if (lastKey.current && lastKey.current !== key) {
          start(() => router.refresh());
        }
        lastKey.current = key;
      } catch {
        /* ignore transient errors */
      }
    }

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [intervalMs, router]);

  return (
    <p className="live-sync-pill" title="A conta familiar sincroniza automaticamente">
      <span className="live-dot" aria-hidden />
      Conta familiar · em sincronização
    </p>
  );
}
