"use client";

import { useTransition } from "react";
import { exportFamilyData, updateTheme } from "@/actions/finance";
import { useTheme } from "@/components/providers/ThemeProvider";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [pending, start] = useTransition();

  return (
    <div className="stack-lg">
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Tema</h3>
        <div className="theme-toggle" style={{ maxWidth: 280 }}>
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`theme-btn ${theme === t ? "active" : ""}`}
              onClick={() => {
                setTheme(t);
                start(async () => {
                  await updateTheme(t);
                });
              }}
            >
              {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Auto"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Exportar dados</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["csv", "excel", "pdf"] as const).map((format) => (
            <button
              key={format}
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await exportFamilyData(format);
                  if (res.ok) download(res.filename, res.content, res.mime);
                });
              }}
            >
              Exportar {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
