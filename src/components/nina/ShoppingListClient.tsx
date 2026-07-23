"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  removeShoppingItem,
  toggleShoppingItem,
} from "@/actions/shopping";

type Item = {
  id: string;
  name: string;
  quantity: string;
  categorySlug: string | null;
  isChecked: boolean;
};

export function ShoppingListClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const open = items.filter((i) => !i.isChecked);
  const done = items.filter((i) => i.isChecked);

  return (
    <div className="stack-lg">
      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            await addShoppingItem(fd);
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}
      >
        <label className="field">
          <span>Artigo</span>
          <input name="name" placeholder="Leite, pão, fruta…" required />
        </label>
        <label className="field">
          <span>Qtd.</span>
          <input name="quantity" defaultValue="1" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Adicionar
        </button>
      </form>

      <div className="list-rows">
        {open.map((item) => (
          <div key={item.id} className="list-row">
            <div className="list-row-main">
              <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={false}
                  disabled={pending}
                  onChange={() => {
                    start(async () => {
                      await toggleShoppingItem(item.id);
                      router.refresh();
                    });
                  }}
                />
                <span>
                  <strong>{item.name}</strong>
                  <span className="muted small" style={{ display: "block" }}>
                    {item.quantity}
                    {item.categorySlug ? ` · ${item.categorySlug}` : ""}
                  </span>
                </span>
              </label>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await removeShoppingItem(item.id);
                  router.refresh();
                });
              }}
            >
              Remover
            </button>
          </div>
        ))}
        {open.length === 0 ? <p className="muted">Lista vazia — adiciona o que falta em casa.</p> : null}
      </div>

      {done.length ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Já comprado ({done.length})</h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await clearCheckedShoppingItems();
                  router.refresh();
                });
              }}
            >
              Limpar
            </button>
          </div>
          <div className="list-rows" style={{ marginTop: "0.5rem", opacity: 0.7 }}>
            {done.map((item) => (
              <div key={item.id} className="list-row">
                <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked
                    disabled={pending}
                    onChange={() => {
                      start(async () => {
                        await toggleShoppingItem(item.id);
                        router.refresh();
                      });
                    }}
                  />
                  <span style={{ textDecoration: "line-through" }}>{item.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
