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
    <div className="space-switcher" role="group" aria-label="Espaço financeiro">
      <button
        type="button"
        className={cn("space-switch-btn", space === "personal" && "active")}
        disabled={pending}
        onClick={() => switchTo("personal")}
      >
        As Minhas Finanças
      </button>
      <button
        type="button"
        className={cn("space-switch-btn", space === "family" && "active")}
        disabled={pending}
        onClick={() => switchTo("family")}
      >
        Conta Familiar
      </button>
    </div>
  );
}
