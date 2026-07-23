"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AutomationLevel, ConnectionKind, ConnectionStatus, ImportProvider } from "@prisma/client";
import {
  AUTOMATION_LEVELS,
  CONNECTION_CATALOG,
  CONNECTION_KIND_LABELS,
  groupCatalogByKind,
} from "@/domain/connections";
import {
  authorizeConnection,
  pauseConnection,
  revokeConnection,
  setAutomationLevel,
  setConnectionAutoImport,
  syncAllAuthorizedConnections,
  syncConnection,
} from "@/actions/connections";

type ConnRow = {
  id: string;
  providerKey: string;
  label: string;
  kind: ConnectionKind;
  status: ConnectionStatus;
  autoImport: boolean;
  importProvider: ImportProvider | null;
  lastSyncAt: Date | string | null;
  lastMessage: string | null;
};

export function ConnectionsCenter({
  connections,
  automationLevel,
}: {
  connections: ConnRow[];
  automationLevel: AutomationLevel;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "available">("all");
  const byKey = useMemo(
    () => Object.fromEntries(connections.map((c) => [c.providerKey, c])),
    [connections],
  );
  const grouped = useMemo(() => groupCatalogByKind(), []);

  function refreshMsg(text: string) {
    setMessage(text);
    router.refresh();
  }

  const activeCount = connections.filter((c) => c.status === "AUTHORIZED").length;

  return (
    <div className="stack-lg ligacoes">
      <section className="panel">
        <header className="panel-head">
          <h2>O teu nível de automatização</h2>
        </header>
        <div className="panel-body">
          <p className="muted small" style={{ marginTop: 0 }}>
            A Nina adapta-se a ti — nunca o contrário. Podes mudar isto quando quiseres. Sem ligações
            externas, tudo continua a funcionar por voz.
          </p>
          <div className="automation-levels">
            {AUTOMATION_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`automation-level ${automationLevel === level.id ? "active" : ""}`}
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    await setAutomationLevel(level.id);
                    refreshMsg(`Nível: ${level.label}`);
                  });
                }}
              >
                <strong>{level.label}</strong>
                <span>{level.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <h2>Ligações ({activeCount} ativas)</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending || activeCount === 0}
              onClick={() => {
                start(async () => {
                  const res = await syncAllAuthorizedConnections();
                  refreshMsg(
                    res.ok
                      ? `Sincronizadas ${res.count} ligações · ${res.imported} movimentos.`
                      : "Não foi possível sincronizar.",
                  );
                });
              }}
            >
              Sincronizar ativas
            </button>
          </div>
        </header>
        <div className="panel-body">
          <p className="muted small" style={{ marginTop: 0 }}>
            Cada ligação é independente e só fica ativa depois da tua autorização explícita. Podes
            adicionar, pausar ou remover a qualquer momento.
          </p>
          <div className="ligacoes-filters">
            {(
              [
                ["all", "Todas"],
                ["active", "Ativas"],
                ["available", "Disponíveis"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`nina-chip ${filter === id ? "is-selected" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {[...grouped.entries()].map(([kind, items]) => {
            const visible = items.filter((item) => {
              const row = byKey[item.key];
              const active = row?.status === "AUTHORIZED";
              if (filter === "active") return active;
              if (filter === "available") return !active;
              return true;
            });
            if (!visible.length) return null;
            return (
              <div key={kind} className="ligacao-group">
                <h3 className="ligacao-kind">{CONNECTION_KIND_LABELS[kind]}</h3>
                <div className="ligacao-grid">
                  {visible.map((item) => {
                    const row = byKey[item.key];
                    const active = row?.status === "AUTHORIZED";
                    const paused = row?.status === "PAUSED";
                    return (
                      <article
                        key={item.key}
                        className={`ligacao-card ${active ? "is-active" : ""} ${item.comingSoon ? "is-soon" : ""}`}
                      >
                        <div className="ligacao-card-head">
                          <strong>{item.label}</strong>
                          <span className={`ligacao-badge ${active ? "on" : paused ? "pause" : "off"}`}>
                            {active ? "Ativa" : paused ? "Pausa" : item.comingSoon ? "Em breve" : "Off"}
                          </span>
                        </div>
                        <p className="muted small">{item.description}</p>
                        {row?.lastMessage ? (
                          <p className="ligacao-msg">{row.lastMessage}</p>
                        ) : null}
                        {row?.lastSyncAt ? (
                          <p className="muted small">
                            Última sync:{" "}
                            {new Date(row.lastSyncAt).toLocaleString("pt-PT", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        ) : null}

                        <div className="ligacao-actions">
                          {!active ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={pending}
                              onClick={() => {
                                start(async () => {
                                  const res = await authorizeConnection(item.key);
                                  refreshMsg(
                                    res.ok
                                      ? `Autorizaste ${item.label}. ${res.message}`
                                      : res.error,
                                  );
                                });
                              }}
                            >
                              Autorizar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={pending}
                                onClick={() => {
                                  start(async () => {
                                    const res = await syncConnection(item.key);
                                    refreshMsg(res.ok ? res.message : res.error);
                                  });
                                }}
                              >
                                Sincronizar
                              </button>
                              <label className="ligacao-auto">
                                <input
                                  type="checkbox"
                                  checked={row.autoImport}
                                  disabled={pending}
                                  onChange={(e) => {
                                    const v = e.target.checked;
                                    start(async () => {
                                      await setConnectionAutoImport(item.key, v);
                                      router.refresh();
                                    });
                                  }}
                                />
                                Auto
                              </label>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={pending}
                                onClick={() => {
                                  start(async () => {
                                    await pauseConnection(item.key);
                                    refreshMsg(`${item.label} em pausa.`);
                                  });
                                }}
                              >
                                Pausar
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={pending}
                                onClick={() => {
                                  start(async () => {
                                    await revokeConnection(item.key);
                                    refreshMsg(`${item.label} removida.`);
                                  });
                                }}
                              >
                                Remover
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filter === "active" && activeCount === 0 ? (
            <p className="muted">Ainda sem ligações. Autoriza só o que quiseres — ou fala só com a Nina.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Sem ligações? Sem problema</h2>
        </header>
        <div className="panel-body">
          <p style={{ marginTop: 0 }}>
            Diz simplesmente: «Nina, paguei 42 € de eletricidade.» · «Nina, recebi o salário.» ·
            «Nina, fui às compras.» A IA trata do resto.
          </p>
          <p className="muted small">
            Privacidade primeiro: nenhuma integração é obrigatória. Todas são opcionais, reversíveis
            e controladas por ti. Catálogo: {CONNECTION_CATALOG.length} módulos preparados.
          </p>
        </div>
      </section>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
