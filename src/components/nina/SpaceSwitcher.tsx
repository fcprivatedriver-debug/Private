"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNinaSpace, type NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";

export function SpaceSwitcher({ space }: { space: NinaSpace }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(space);

  function switchTo(next: NinaSpace) {
    if (next === optimistic || pending) return;
    start(async () => {
      setOptimistic(next);
      await setNinaSpace(next);
      router.refresh();
    });
  }

  return (
    <div
      className={cn("space-switcher", pending && "is-pending")}
      role="tablist"
      aria-label="Espaço financeiro"
      aria-busy={pending}
    >
      <button
        type="button"
        role="tab"
        aria-selected={optimistic === "personal"}
        className={cn("space-switch-btn", optimistic === "personal" && "active")}
        disabled={pending}
        onClick={() => switchTo("personal")}
      >
        <span className="space-switch-full">Pessoal</span>
        <span className="space-switch-short">Pessoal</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={optimistic === "family"}
        className={cn("space-switch-btn", optimistic === "family" && "active")}
        disabled={pending}
        onClick={() => switchTo("family")}
      >
        <span className="space-switch-full">Familiar</span>
        <span className="space-switch-short">Familiar</span>
      </button>
    </div>
  );
}
