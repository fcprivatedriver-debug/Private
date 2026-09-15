"use client";

import { useTransition } from "react";
import { setPreferredNavApp } from "@/actions/assistant-modules";
import type { NavApp } from "@/lib/navigation";

const APPS: { id: NavApp; label: string }[] = [
  { id: "google_maps", label: "Google Maps" },
  { id: "waze", label: "Waze" },
  { id: "apple_maps", label: "Apple Maps" },
];

export function NavAppPicker() {
  const [pending, start] = useTransition();
  return (
    <div className="btn-row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
      {APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={() => start(async () => { await setPreferredNavApp(app.id); })}
        >
          {app.label}
        </button>
      ))}
    </div>
  );
}
