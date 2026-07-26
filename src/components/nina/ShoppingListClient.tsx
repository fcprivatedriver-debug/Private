"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addShoppingItemNatural,
  clearCheckedShoppingItems,
  compareShoppingTrip,
  confirmShoppingProductChoice,
  createShoppingList,
  deleteShoppingList,
  removeShoppingItem,
  renameShoppingList,
  toggleShoppingItem,
  updateShoppingItem,
} from "@/actions/shopping";
import { formatEUR } from "@/lib/money";

type Item = {
  id: string;
  name: string;
  quantity: string;
  categorySlug: string | null;
  isChecked: boolean;
  brand?: string | null;
  weight?: string | null;
  priceCents?: number | null;
  imageUrl?: string | null;
  storeName?: string | null;
  productUrl?: string | null;
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
  const [showNewList, setShowNewList] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [choices, setChoices] = useState<
    { id: string; label: string; product: unknown }[] | null
  >(null);
  const [tripReply, setTripReply] = useState<string | null>(null);
  const active = lists.find((l) => l.id === activeListId) || lists[0];
  const items = active?.items ?? [];
  const open = items.filter((i) => !i.isChecked);
  const done = items.filter((i) => i.isChecked);

  if (!active) {
    return <p className="muted">A preparar a tua lista…</p>;
  }

  return (
    <div className="stack-lg">
      {lists.length > 1 ? (
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
      ) : null}

      <div className="btn-row" style={{ flexWrap: "wrap" }}>
        <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-primary">
          🎤 Diz o que precisas
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const res = await compareShoppingTrip();
              setTripReply(res.reply);
            });
          }}
        >
          Vou às compras
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowNewList((v) => !v)}
        >
          {showNewList ? "Cancelar" : "Nova lista"}
        </button>
      </div>

      {tripReply ? (
        <p className="muted" style={{ whiteSpace: "pre-wrap", margin: 0 }}>
          {tripReply}
        </p>
      ) : null}

      {showNewList ? (
        <form
          className="form-grid form-grid-compact"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              await createShoppingList(fd);
              setShowNewList(false);
              (e.target as HTMLFormElement).reset();
              router.refresh();
            });
          }}
        >
          <label className="field">
            <span>Nome da nova lista</span>
            <input name="name" placeholder="Ex: Fim de semana" required />
          </label>
          <button className="btn btn-ghost" type="submit" disabled={pending}>
            Criar lista
          </button>
        </form>
      ) : null}

      <form
        className="form-grid form-grid-compact"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get("utterance") || "").trim();
          if (!q) return;
          start(async () => {
            const res = await addShoppingItemNatural(q, active.id);
            if (res.ok && res.status === "choices" && "choices" in res) {
              setChoices(res.choices);
              setVoiceHint(res.reply);
            } else if (res.ok) {
              setChoices(null);
              setVoiceHint(res.reply);
              (e.target as HTMLFormElement).reset();
              router.refresh();
            } else {
              setVoiceHint(res.error);
            }
          });
        }}
      >
        <label className="field">
          <span>Fala ou escreve naturalmente</span>
          <input
            name="utterance"
            placeholder="Ex.: seis litros de leite Vigor meio gordo"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Adicionar com a Nina
        </button>
      </form>

      {voiceHint ? (
        <p className="muted small" style={{ margin: 0 }}>
          {voiceHint}
        </p>
      ) : null}

      {choices?.length ? (
        <div className="stack-sm">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start", textAlign: "left" }}
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await confirmShoppingProductChoice(
                    JSON.stringify(c.product),
                    active.id,
                  );
                  setChoices(null);
                  setVoiceHint(res.ok ? res.reply : res.error);
                  router.refresh();
                });
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      <details className="lista-advanced">
        <summary className="muted small">Opções da lista</summary>
        <form
          className="form-grid form-grid-compact"
          style={{ marginTop: "0.75rem" }}
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
      </details>

      <p className="muted small" style={{ margin: 0 }}>
        {active.isShared
          ? "Partilhada na Conta Familiar — todos veem e atualizam."
          : "Lista pessoal."}
      </p>

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
                      {[item.quantity, item.brand, item.weight, item.storeName]
                        .filter(Boolean)
                        .join(" · ")}
                      {item.priceCents != null ? ` · ${formatEUR(item.priceCents)}` : ""}
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
          <p className="muted">
            Lista pronta e vazia. Diz à Nina o que precisas — «adiciona manteiga Milhafre».
          </p>
        ) : null}
      </div>

      {done.length > 0 ? (
        <div>
          <div className="btn-row" style={{ marginBottom: "0.5rem" }}>
            <strong className="muted small">Já no carrinho ({done.length})</strong>
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
          {done.map((item) => (
            <div key={item.id} className="list-row is-checked">
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
                <span className="muted">
                  <s>{item.name}</s>
                </span>
              </label>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
