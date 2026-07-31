"use client";

import { useActionState } from "react";
import { updateSettingsAction } from "@/actions/admin";
import type { ActionState } from "@/actions/auth";

const initial: ActionState = {};

type Settings = {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  toleranceMinutes: number;
  minimumChargeMinutes: number;
  lowBalanceThreshold: number;
  maxPickupDistanceKm: number | null;
  heroTitlePt: string;
  heroSubtitlePt: string;
  heroImageUrl: string;
  termsHtmlPt: string;
  privacyHtmlPt: string;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState(updateSettingsAction, initial);

  return (
    <form action={formAction} className="panel panel-lift">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="grid-2">
        <div className="field">
          <label className="label">Nome da marca</label>
          <input className="input" name="brandName" defaultValue={settings.brandName} />
        </div>
        <div className="field">
          <label className="label">E-mail de suporte</label>
          <input className="input" name="supportEmail" defaultValue={settings.supportEmail} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label">Telefone</label>
          <input className="input" name="supportPhone" defaultValue={settings.supportPhone} />
        </div>
        <div className="field">
          <label className="label">WhatsApp</label>
          <input className="input" name="whatsappNumber" defaultValue={settings.whatsappNumber} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label">Tolerância (min)</label>
          <input className="input" type="number" name="toleranceMinutes" defaultValue={settings.toleranceMinutes} />
        </div>
        <div className="field">
          <label className="label">Cobrança mínima (min)</label>
          <input className="input" type="number" name="minimumChargeMinutes" defaultValue={settings.minimumChargeMinutes} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label">Alerta saldo baixo (min)</label>
          <input className="input" type="number" name="lowBalanceThreshold" defaultValue={settings.lowBalanceThreshold} />
        </div>
        <div className="field">
          <label className="label">Distância máx. recolha (km)</label>
          <input className="input" type="number" name="maxPickupDistanceKm" defaultValue={settings.maxPickupDistanceKm ?? ""} />
        </div>
      </div>

      <div className="field">
        <label className="label">Título hero (PT)</label>
        <input className="input" name="heroTitlePt" defaultValue={settings.heroTitlePt} />
      </div>
      <div className="field">
        <label className="label">Subtítulo hero (PT)</label>
        <textarea className="textarea" name="heroSubtitlePt" defaultValue={settings.heroSubtitlePt} />
      </div>
      <div className="field">
        <label className="label">Imagem hero (URL)</label>
        <input className="input" name="heroImageUrl" defaultValue={settings.heroImageUrl} />
      </div>
      <div className="field">
        <label className="label">Termos (HTML PT)</label>
        <textarea className="textarea" name="termsHtmlPt" defaultValue={settings.termsHtmlPt} rows={6} />
      </div>
      <div className="field">
        <label className="label">Privacidade (HTML PT)</label>
        <textarea className="textarea" name="privacyHtmlPt" defaultValue={settings.privacyHtmlPt} rows={6} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "A guardar…" : "Guardar configurações"}
      </button>
    </form>
  );
}
