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
  updateHouseholdSettings,
  updateMemberRole,
} from "@/actions/household";
import { InviteShare } from "@/components/nina/InviteShare";

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
  myRole,
  members,
  latestInvitePath,
  allowMembersEditOthers = false,
}: {
  familyName: string;
  kind: HouseholdKind;
  myRole: FamilyRole;
  members: Member[];
  latestInvitePath?: string | null;
  allowMembersEditOthers?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const admin = canManageMembers(myRole);
  const isIndividual = kind === "INDIVIDUAL";

  return (
    <div className="stack-lg">
      <section className="panel">
        <header className="panel-head">
          <h2>{isIndividual ? "Criar Conta Familiar" : "Convidar em segundos"}</h2>
        </header>
        <div className="panel-body">
          <InviteShare isIndividual={isIndividual} initialInvitePath={latestInvitePath} />
        </div>
      </section>

      {!isIndividual ? (
        <section className="panel">
          <header className="panel-head">
            <h2>Tipo de conta</h2>
          </header>
          <div className="panel-body">
            <p className="muted small" style={{ marginTop: 0 }}>
              Cada membro tem o seu perfil e autenticação — a Conta Familiar partilha o que é de casa.
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
                <label className="field">
                  <span>Permitir que os membros editem movimentos uns dos outros</span>
                  <select
                    name="allowMembersEditOthers"
                    defaultValue={allowMembersEditOthers ? "sim" : "nao"}
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>
                <p className="muted small">
                  Cada um pode sempre editar e eliminar os seus próprios movimentos. Com «Sim»,
                  qualquer editor pode corrigir os movimentos dos outros.
                </p>
                <p className="muted small">{HOUSEHOLD_KIND_HINTS[kind]}</p>
                <button className="btn btn-primary" type="submit" disabled={pending}>
                  Guardar
                </button>
              </form>
            ) : (
              <p>
                <strong>{HOUSEHOLD_KIND_LABELS[kind]}</strong> · {familyName}
                <br />
                <span className="muted small">
                  Editar movimentos uns dos outros: {allowMembersEditOthers ? "Sim" : "Não"}
                </span>
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <header className="panel-head">
          <h2>Perfis ({members.length})</h2>
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

      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
