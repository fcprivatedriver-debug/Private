"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  createShoppingList,
  deleteShoppingList,
  removeShoppingItem,
  renameShoppingList,
  toggleShoppingItem,
  updateShoppingItem,
} from "@/actions/shopping";

type Item = {
  id: string;
  name: string;
  quantity: string;
  categorySlug: string | null;
  isChecked: boolean;
};

type List = {
  id: string;
  name: string;
  isShared: boolean;
  items: Item[];
};

export function ShoppingListClient({
  lists,
  activeListId,
}: {
  lists: List[];
  activeListId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const active = lists.find((l) => l.id === activeListId) || lists[0];
  const items = active?.items ?? [];
  const open = items.filter((i) => !i.isChecked);
  const done = items.filter((i) => i.isChecked);

  if (!active) {
    return <p className="muted">Sem listas ainda.</p>;
  }

  return (
    <div className="stack-lg">
      <div className="list-tabs">
        {lists.map((l) => (
          <a
            key={l.id}
            href={`/pt/lista?list=${l.id}`}
            className={`list-tab ${l.id === active.id ? "active" : ""}`}
          >
            {l.name}
          </a>
        ))}
      </div>

      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            await createShoppingList(fd);
            (e.target as HTMLFormElement).reset();
            router.refresh();
          });
        }}
      >
        <label className="field">
          <span>Nova lista</span>
          <input name="name" placeholder="Ex: Fim de semana" required />
        </label>
        <button className="btn btn-ghost" type="submit" disabled={pending}>
          Criar lista
        </button>
      </form>

      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("listId", active.id);
          start(async () => {
            await renameShoppingList(fd);
            router.refresh();
          });
        }}
      >
        <label className="field">
          <span>Nome da lista</span>
          <input name="name" defaultValue={active.name} required />
        </label>
        <input type="hidden" name="listId" value={active.id} />
        <div className="btn-row">
          <button className="btn btn-ghost btn-sm" type="submit" disabled={pending}>
            Guardar nome
          </button>
          {lists.length > 1 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm text-expense"
              disabled={pending}
              onClick={() => {
                if (!confirm("Eliminar esta lista e os seus artigos?")) return;
                start(async () => {
                  await deleteShoppingList(active.id);
                  router.push("/pt/lista");
                  router.refresh();
                });
              }}
            >
              Eliminar lista
            </button>
          ) : null}
        </div>
      </form>

      <p className="muted small">
        {active.isShared
          ? "Partilhada na Conta Familiar — todos os membros veem e atualizam."
          : "Lista pessoal."}
      </p>

      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("listId", active.id);
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
              {editingId === item.id ? (
                <form
                  className="inline-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    fd.set("id", item.id);
                    start(async () => {
                      await updateShoppingItem(fd);
                      setEditingId(null);
                      router.refresh();
                    });
                  }}
                >
                  <input name="name" defaultValue={item.name} required />
                  <input name="quantity" defaultValue={item.quantity} style={{ width: "4rem" }} />
                  <button className="btn btn-sm btn-primary" type="submit">
                    Ok
                  </button>
                </form>
              ) : (
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
                    </span>
                  </span>
                </label>
              )}
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={pending}
                onClick={() => setEditingId(item.id)}
              >
                Editar
              </button>
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
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {open.length === 0 ? (
          <p className="muted">Lista vazia — adiciona o que falta em casa.</p>
        ) : null}
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
                  await clearCheckedShoppingItems(active.id);
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
