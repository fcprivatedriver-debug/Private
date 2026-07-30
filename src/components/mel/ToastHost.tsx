"use client";

import { useEffect, useState } from "react";
import {
  rehydrateReminders,
  subscribeToasts,
  type ToastPayload,
} from "@/modules/notifications/client";

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    void rehydrateReminders();
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev.slice(-4), t]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 5200);
    });
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind || "info"}`}>
          <strong>{t.title}</strong>
          {t.body ? <p className="small">{t.body}</p> : null}
        </div>
      ))}
    </div>
  );
}
