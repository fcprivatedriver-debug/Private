"use client";

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type HomePane = "add" | "know";

/**
 * Navegação ADD ↔ KNOW com toque + swipe horizontal.
 * Threshold: deslocação horizontal dominante; scroll vertical não muda de separador.
 */
export function AddKnowTabs({
  initialPane = "add",
  addChildren,
  knowChildren,
}: {
  initialPane?: HomePane;
  addChildren: ReactNode;
  knowChildren: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams?.get("pane");
  const start: HomePane =
    fromUrl === "know" || fromUrl === "add" ? fromUrl : initialPane;
  const [pane, setPane] = useState<HomePane>(start);
  const [, startTransition] = useTransition();

  const touchRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const go = useCallback(
    (next: HomePane) => {
      if (next === pane) return;
      setPane(next);
      startTransition(() => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        if (next === "add") params.delete("pane");
        else params.set("pane", next);
        const q = params.toString();
        router.replace(q ? `/pt/dashboard?${q}` : "/pt/dashboard", { scroll: false });
      });
    },
    [pane, router, searchParams],
  );

  function onTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement | null;
    // Não iniciar swipe em selects, inputs, botões, links ou gráficos
    if (
      target?.closest(
        "select, input, textarea, button, a, [role='listbox'], [role='menu'], .know-evo-chart, .know-filters",
      )
    ) {
      touchRef.current = null;
      return;
    }
    const t = e.changedTouches[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, active: true };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const startPt = touchRef.current;
    touchRef.current = null;
    if (!startPt?.active) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startPt.x;
    const dy = t.clientY - startPt.y;
    // Exigir gesto claramente horizontal (threshold ~56px; vertical dominante = scroll)
    if (Math.abs(dx) < 56) return;
    if (Math.abs(dx) < Math.abs(dy) * 1.35) return;
    if (dx < 0 && pane === "add") go("know");
    if (dx > 0 && pane === "know") go("add");
  }

  return (
    <div className="add-know-workspace">
      <div className="add-know-tabs" role="tablist" aria-label="ADD e KNOW">
        <button
          type="button"
          role="tab"
          aria-selected={pane === "add"}
          className={cn("add-know-tab", pane === "add" && "is-active")}
          onClick={() => go("add")}
        >
          ADD
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "know"}
          className={cn("add-know-tab", pane === "know" && "is-active")}
          onClick={() => go("know")}
        >
          KNOW
        </button>
      </div>

      <div
        className="add-know-panes"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          role="tabpanel"
          hidden={pane !== "add"}
          className={cn("add-know-pane", pane === "add" && "is-visible")}
          aria-label="ADD — fazer e adicionar"
        >
          {addChildren}
        </div>
        <div
          role="tabpanel"
          hidden={pane !== "know"}
          className={cn("add-know-pane", pane === "know" && "is-visible")}
          aria-label="KNOW — perceber e analisar"
        >
          {knowChildren}
        </div>
      </div>
    </div>
  );
}
