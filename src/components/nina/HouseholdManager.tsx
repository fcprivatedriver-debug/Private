"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FamilyRole, HouseholdKind } from "@prisma/client";
import {
  HOUSEHOLD_KIND_HINTS,
  HOUSEHOLD_KIND_LABELS,
  PERMISSION_HINTS,
  PERMISSION_LABELS,
  canManageMembers,
} from "@/domain/household";
import {
  ensureInviteCode,
  inviteMemberToHousehold,
  joinHouseholdByCode,
  updateHouseholdSettings,
  updateMemberRole,
} from "@/actions/household";

type Member = {
  id: string;
  displayName: string;
  role: FamilyRole;
  color: string;
  user: { email: string };
};

export function HouseholdManager({
  familyName,
  kind,
  inviteCode,
  myRole,
  members,
}: {
  familyName: string;
  kind: HouseholdKind;
  inviteCode: string | null;
  myRole: FamilyRole;
  members: Member[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState(inviteCode ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const admin = canManageMembers(myRole);

  return (
    <div className="stack-lg">
      <section className="panel">
        <header className="panel-head">
          <h2>Tipo de conta</h2>
        </header>
        <div className="panel-body">
          <p className="muted small" style={{ marginTop: 0 }}>
            Toda a família (ou grupo) partilha a mesma visão — saldo, gastos, objetivos e estatísticas.
          </p>
          {admin ? (
            <form
              className="form-grid form-grid-compact"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  await updateHouseholdSettings(fd);
                  setMessage("Conta atualizada.");
                  router.refresh();
                });
              }}
            >
              <label className="field">
                <span>Nome da conta</span>
                <input name="name" defaultValue={familyName} required />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select name="kind" defaultValue={kind}>
                  {(Object.keys(HOUSEHOLD_KIND_LABELS) as HouseholdKind[]).map((k) => (
                    <option key={k} value={k}>
                      {HOUSEHOLD_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted small">{HOUSEHOLD_KIND_HINTS[kind]}</p>
              <button className="btn btn-primary" type="submit" disabled={pending}>
                Guardar
              </button>
            </form>
          ) : (
            <p>
              <strong>{HOUSEHOLD_KIND_LABELS[kind]}</strong> · {familyName}
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Membros ({members.length})</h2>
        </header>
        <div className="panel-body">
          <div className="member-grid">
            {members.map((m) => (
              <div key={m.id} className="member-card">
                <div className="avatar" style={{ background: m.color }}>
                  {m.displayName.slice(0, 1).toUpperCase()}
                </div>
                <strong>{m.displayName}</strong>
                <p className="muted small">{m.user.email}</p>
                {admin && m.role !== "OWNER" ? (
                  <select
                    className="role-select"
                    defaultValue={m.role}
                    disabled={pending}
                    onChange={(e) => {
                      const role = e.target.value as FamilyRole;
                      start(async () => {
                        await updateMemberRole(m.id, role);
                        router.refresh();
                      });
                    }}
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="MEMBER">Editor</option>
                    <option value="VIEWER">Apenas consulta</option>
                  </select>
                ) : (
                  <p className="small">{PERMISSION_LABELS[m.role]}</p>
                )}
                <p className="muted small">{PERMISSION_HINTS[m.role]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {admin ? (
        <section className="panel">
          <header className="panel-head">
            <h2>Convidar alguém</h2>
          </header>
          <div className="panel-body stack-lg">
            <form
              className="form-grid form-grid-compact"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const res = await inviteMemberToHousehold(fd);
                  setMessage(res.ok ? "Convite criado — a pessoa já pode entrar." : res.error);
                  if (res.ok) {
                    (e.target as HTMLFormElement).reset();
                    router.refresh();
                  }
                });
              }}
            >
              <label className="field">
                <span>Nome</span>
                <input name="name" required />
              </label>
              <label className="field">
                <span>Email</span>
                <input name="email" type="email" required />
              </label>
              <label className="field">
                <span>Permissão</span>
                <select name="role" defaultValue="MEMBER">
                  <option value="ADMIN">Administrador</option>
                  <option value="MEMBER">Editor</option>
                  <option value="VIEWER">Apenas consulta</option>
                </select>
              </label>
              <label className="field">
                <span>Password inicial</span>
                <input name="password" type="password" defaultValue="nina123" />
              </label>
              <button className="btn btn-primary" type="submit" disabled={pending}>
                Adicionar à conta
              </button>
            </form>

            <div>
              <p className="muted small">Ou partilha um código de convite:</p>
              <div className="inline-form" style={{ gap: "0.5rem" }}>
                <input readOnly value={code || "—"} style={{ width: "12rem" }} />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={pending}
                  onClick={() => {
                    start(async () => {
                      const res = await ensureInviteCode();
                      if (res.ok) {
                        setCode(res.code);
                        setMessage("Código pronto para partilhar.");
                        router.refresh();
                      }
                    });
                  }}
                >
                  Gerar código
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <header className="panel-head">
          <h2>Entrar noutra conta</h2>
        </header>
        <div className="panel-body">
          <form
            className="form-grid form-grid-compact"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await joinHouseholdByCode(fd);
                setMessage(res.ok ? res.message : res.error);
                if (res.ok) router.refresh();
              });
            }}
          >
            <label className="field">
              <span>Código do convite</span>
              <input name="code" placeholder="NINA-XXXXXX" required />
            </label>
            <button className="btn btn-ghost" type="submit" disabled={pending}>
              Juntar-me
            </button>
          </form>
        </div>
      </section>

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
