"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/actions/notifications";

type Noti = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  href: string;
};

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Noti[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount: number; notifications: Noti[] };
      setUnread(data.unreadCount);
      setItems(data.notifications);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 45000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function openPanel() {
    setOpen((v) => !v);
    if (!open) await load();
  }

  function onItemClick(n: Noti) {
    startTransition(async () => {
      const result = await markNotificationReadAction(n.id);
      setOpen(false);
      await load();
      router.push(result.ok ? result.href : n.href);
      router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      await load();
      router.refresh();
    });
  }

  return (
    <div className="noti-bell" ref={rootRef}>
      <button
        type="button"
        className="noti-bell-btn"
        aria-label={unread > 0 ? `${unread} notificações não lidas` : "Notificações"}
        aria-expanded={open}
        onClick={() => void openPanel()}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && <span className="noti-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="noti-panel" role="dialog" aria-label="Notificações">
          <div className="noti-panel-head">
            <strong>Notificações</strong>
            {unread > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={markAll}>
                Marcar todas
              </button>
            )}
          </div>
          {loading && items.length === 0 && <p className="muted noti-empty">A carregar…</p>}
          {!loading && items.length === 0 && (
            <p className="muted noti-empty">Sem notificações.</p>
          )}
          <ul className="noti-list">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={n.readAt ? "noti-item" : "noti-item is-unread"}
                  disabled={pending}
                  onClick={() => onItemClick(n)}
                >
                  <strong>{n.title}</strong>
                  <span>{n.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
