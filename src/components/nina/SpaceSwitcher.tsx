"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setNinaSpace, type NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";

export function SpaceSwitcher({ space }: { space: NinaSpace }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function switchTo(next: NinaSpace) {
    if (next === space || pending) return;
    start(async () => {
      await setNinaSpace(next);
      router.refresh();
    });
  }

  return (
    <div className="space-switcher" role="tablist" aria-label="Espaço financeiro">
      <button
        type="button"
        role="tab"
        aria-selected={space === "personal"}
        className={cn("space-switch-btn", space === "personal" && "active")}
        disabled={pending}
        onClick={() => switchTo("personal")}
      >
        <span className="space-switch-full">As Minhas Finanças</span>
        <span className="space-switch-short">Pessoal</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={space === "family"}
        className={cn("space-switch-btn", space === "family" && "active")}
        disabled={pending}
        onClick={() => switchTo("family")}
      >
        <span className="space-switch-full">Conta Familiar</span>
        <span className="space-switch-short">Familiar</span>
      </button>
    </div>
  );
}
