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
  removeFamilyMember,
} from "@/actions/household";
import { InviteShare } from "@/components/nina/InviteShare";

type Member = {
  id: string;
  displayName: string;
  role: FamilyRole;
  color: string;
  user: { email: string };
};

type PendingInvite = {
  id: string;
  channel: string;
  email: string | null;
  phone: string | null;
  inviteeName: string | null;
  expiresAt: string;
  status: "Pendente";
};

export function HouseholdManager({
  familyName,
  kind,
  myRole,
  members,
  latestInvitePath,
  allowMembersEditOthers = false,
  pendingInvites = [],
}: {
  familyName: string;
  kind: HouseholdKind;
  myRole: FamilyRole;
  members: Member[];
  latestInvitePath?: string | null;
  allowMembersEditOthers?: boolean;
  pendingInvites?: PendingInvite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const admin = canManageMembers(myRole);
  const isIndividual = kind === "INDIVIDUAL";

  return (
    <div className="stack-lg">
      <section className="panel" id="gerir-familia">
        <header className="panel-head">
          <h2>{isIndividual ? "Criar Família" : "Família"}</h2>
        </header>
        <div className="panel-body">
          {!isIndividual ? (
            <p style={{ marginTop: 0 }}>
              <strong>{familyName}</strong>
            </p>
          ) : null}
          <InviteShare
            isIndividual={isIndividual}
            initialInvitePath={latestInvitePath}
            pendingInvites={admin ? pendingInvites : []}
          />
        </div>
      </section>

      {!isIndividual ? (
        <section className="panel">
          <header className="panel-head">
            <h2>Tipo de conta</h2>
          </header>
          <div className="panel-body">
            <p className="muted small" style={{ marginTop: 0 }}>
              Cada membro tem o seu perfil e autenticação — a Família partilha o que é de casa.
              O espaço Pessoal de cada um nunca é misturado.
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
                  <span>Nome da Família</span>
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
                  qualquer membro editor pode corrigir os movimentos familiares dos outros.
                  Dados Pessoais continuam isolados.
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

      <section className="panel" id="membros">
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
                <p className="small">{PERMISSION_LABELS[m.role]}</p>
                {admin && m.role !== "OWNER" ? (
                  <>
                    <select
                      className="role-select"
                      defaultValue={m.role}
                      disabled={pending}
                      aria-label={`Permissão de ${m.displayName}`}
                      onChange={(e) => {
                        const role = e.target.value as FamilyRole;
                        start(async () => {
                          await updateMemberRole(m.id, role);
                          router.refresh();
                        });
                      }}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="MEMBER">Membro</option>
                      <option value="VIEWER">Apenas consulta</option>
                    </select>
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      disabled={pending}
                      aria-label={`Remover ${m.displayName} da família`}
                      onClick={() =>
                        start(async () => {
                          const res = await removeFamilyMember(m.id);
                          setMessage(res.ok ? "Membro removido da família." : res.error);
                          router.refresh();
                        })
                      }
                    >
                      Remover
                    </button>
                  </>
                ) : null}
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
