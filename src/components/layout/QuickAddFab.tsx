"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ACTIONS = [
  { href: "/pt/despesas/nova", label: "Despesa", hint: "Registar um gasto" },
  { href: "/pt/receitas/nova", label: "Receita", hint: "Registar uma entrada" },
  { href: "/pt/captura?mode=photo&auto=1", label: "Fatura", hint: "Fotografar ou anexar" },
] as const;

/**
 * FAB + — menu compacto com feedback imediato ao toque.
 */
export function QuickAddFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Evitar sobrepor o botão Guardar em formulários de criação
  const hideOnForm =
    Boolean(pathname?.includes("/nova")) ||
    Boolean(pathname?.match(/\/(despesas|receitas)\/[^/]+$/));

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (hideOnForm) return null;

  return (
    <div className={`quick-add ${open ? "is-open" : ""}`} ref={rootRef}>
      {open ? (
        <div id={menuId} className="quick-add-menu" role="menu" aria-label="Adicionar">
          {ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              role="menuitem"
              className="quick-add-item"
              onClick={() => setOpen(false)}
            >
              <strong>+ {a.label}</strong>
              <span className="muted small">{a.hint}</span>
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="captura-fab quick-add-fab"
        aria-label={open ? "Fechar menu" : "Adicionar"}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "×" : "+"}
      </button>
    </div>
  );
}
