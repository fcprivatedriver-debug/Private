"use client";

import { useState, useTransition } from "react";
import {
  importExternalProducts,
  loadExternalDataAdmin,
  triggerExternalSync,
} from "@/actions/external-data-admin";

type Snapshot = Awaited<ReturnType<typeof loadExternalDataAdmin>>;

export function ExternalDataAdminClient() {
  const [adminKey, setAdminKey] = useState("");
  const [snap, setSnap] = useState<Extract<Snapshot, { ok: true }>["snapshot"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [importStore, setImportStore] = useState("continente");
  const [payload, setPayload] = useState(
    '[\n  {"name":"Leite meio-gordo 1L","brand":"Mimosa","price":0.89,"currency":"EUR"}\n]',
  );

  function unlock() {
    start(async () => {
      setError(null);
      setMessage(null);
      const res = await loadExternalDataAdmin(adminKey);
      if (!res.ok) {
        setSnap(null);
        setError(res.error);
        return;
      }
      setSnap(res.snapshot);
    });
  }

  function syncNow(source: string) {
    start(async () => {
      setError(null);
      setMessage(null);
      const fd = new FormData();
      fd.set("adminKey", adminKey);
      fd.set("source", source);
      const res = await triggerExternalSync(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        `${source}: ${res.result.status} · ${res.result.recordsUpserted} registos` +
          (res.result.errorSummary ? ` · ${res.result.errorSummary}` : ""),
      );
      const refreshed = await loadExternalDataAdmin(adminKey);
      if (refreshed.ok) setSnap(refreshed.snapshot);
    });
  }

  function doImport() {
    start(async () => {
      setError(null);
      setMessage(null);
      const fd = new FormData();
      fd.set("adminKey", adminKey);
      fd.set("store", importStore);
      fd.set("payload", payload);
      fd.set("priceIsCents", "false");
      const res = await importExternalProducts(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        `Import ${importStore}: ${res.result.imported} ok, ${res.result.rejected} rejeitados` +
          (res.result.errors[0] ? ` · ${res.result.errors[0]}` : ""),
      );
      const refreshed = await loadExternalDataAdmin(adminKey);
      if (refreshed.ok) setSnap(refreshed.snapshot);
    });
  }

  return (
    <div className="page-stack">
      <header>
        <p className="nina-kicker">Admin técnico</p>
        <h1 className="page-title">Dados externos</h1>
        <p className="page-sub">
          Sincronização e importação — apenas com chave de administrador. Utilizadores normais não
          têm acesso.
        </p>
      </header>

      <section className="panel" style={{ padding: "1rem" }}>
        <label className="muted small" htmlFor="adminKey">
          Chave EXTERNAL_DATA_ADMIN_KEY / PRODUCT_ACCESS_ADMIN_KEY
        </label>
        <div className="btn-row" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
          <input
            id="adminKey"
            type="password"
            className="input"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Chave admin"
            style={{ minWidth: "220px", flex: 1 }}
          />
          <button type="button" className="btn btn-primary" disabled={pending || !adminKey} onClick={unlock}>
            Desbloquear
          </button>
        </div>
        {error ? <p className="muted small" style={{ color: "var(--danger, #b00)", marginTop: "0.75rem" }}>{error}</p> : null}
        {message ? <p className="muted small" style={{ marginTop: "0.75rem" }}>{message}</p> : null}
      </section>

      {snap ? (
        <>
          <section className="panel" style={{ padding: "1rem" }}>
            <h2 className="section-title" style={{ marginBottom: "0.75rem" }}>Fontes</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
              {snap.sources.map((s) => (
                <li key={s.source} style={{ borderTop: "1px solid var(--border, #ddd)", paddingTop: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <strong>{s.label}</strong>
                      <p className="muted small" style={{ margin: "0.25rem 0" }}>
                        {s.recordCount} registos · auto: {s.automation} · comercial: {s.commercial}
                      </p>
                      <p className="muted small" style={{ margin: 0 }}>
                        Última tentativa:{" "}
                        {s.lastAttempt
                          ? `${s.lastAttempt.status} @ ${s.lastAttempt.startedAt}${
                              s.lastAttempt.errorSummary ? ` — ${s.lastAttempt.errorSummary}` : ""
                            }`
                          : "nunca"}
                      </p>
                      <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
                        Último sucesso: {s.lastSuccess?.finishedAt ?? "—"} (
                        {s.lastSuccess?.recordsUpserted ?? 0} upserts)
                      </p>
                      {s.gate ? (
                        <p className="muted small" style={{ margin: "0.15rem 0 0" }}>
                          Gate: {s.gate}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={pending}
                      onClick={() => syncNow(s.source)}
                    >
                      Atualizar agora
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" style={{ padding: "1rem" }}>
            <h2 className="section-title">Importação manual (supermercados)</h2>
            <p className="muted small">
              CSV ou JSON. Validação antes de gravar — linhas inválidas são rejeitadas; dados
              anteriores mantêm-se.
            </p>
            <div className="btn-row" style={{ margin: "0.75rem 0", flexWrap: "wrap" }}>
              <select
                className="input"
                value={importStore}
                onChange={(e) => setImportStore(e.target.value)}
              >
                <option value="continente">Continente</option>
                <option value="pingo_doce">Pingo Doce</option>
                <option value="auchan">Auchan</option>
              </select>
              <button type="button" className="btn btn-primary" disabled={pending} onClick={doImport}>
                Importar
              </button>
            </div>
            <textarea
              className="input"
              rows={8}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
