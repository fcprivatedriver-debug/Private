"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/auth";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

export function ProfileForm({
  defaults,
}: {
  defaults: {
    fullName: string;
    addressLine: string;
    postalCode: string;
    city: string;
    birthDate: string;
    taxId: string;
    phone: string;
    altPhone: string;
    notes: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={formAction} className="panel panel-lift">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="field">
        <label className="label" htmlFor="fullName">
          Nome completo *
        </label>
        <input className="input" id="fullName" name="fullName" required defaultValue={defaults.fullName} />
      </div>

      <div className="field">
        <label className="label" htmlFor="addressLine">
          Morada *
        </label>
        <input className="input" id="addressLine" name="addressLine" required defaultValue={defaults.addressLine} />
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="postalCode">
            Código postal *
          </label>
          <input className="input" id="postalCode" name="postalCode" required defaultValue={defaults.postalCode} />
        </div>
        <div className="field">
          <label className="label" htmlFor="city">
            Localidade *
          </label>
          <input className="input" id="city" name="city" required defaultValue={defaults.city} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="birthDate">
            Data de nascimento
          </label>
          <input className="input" type="date" id="birthDate" name="birthDate" defaultValue={defaults.birthDate} />
        </div>
        <div className="field">
          <label className="label" htmlFor="taxId">
            NIF
          </label>
          <input className="input" id="taxId" name="taxId" defaultValue={defaults.taxId} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="phone">
            Telefone *
          </label>
          <input className="input" id="phone" name="phone" required defaultValue={defaults.phone} />
        </div>
        <div className="field">
          <label className="label" htmlFor="altPhone">
            Telefone alternativo
          </label>
          <input className="input" id="altPhone" name="altPhone" defaultValue={defaults.altPhone} />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea className="textarea" id="notes" name="notes" defaultValue={defaults.notes} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "A guardar…" : "Guardar perfil"}
      </button>
    </form>
  );
}
