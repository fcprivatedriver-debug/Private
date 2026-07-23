"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createTripAction } from "@/actions/marketplace";
import { AddressAutocompleteInput } from "@/components/map/AddressAutocompleteInput";
import { useLocale, useTranslations } from "next-intl";

type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
  maxPassengers: number;
  maxLuggage: number;
};

export default function NewTripPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("tripForm");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<VehicleClassOption[]>([]);

  useEffect(() => {
    fetch(`/api/vehicle-classes?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => setClasses([]));
  }, [locale]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("publish", "true");
    const preferred = String(formData.get("preferredVehicleClassId") || "");
    if (!preferred) formData.delete("preferredVehicleClassId");
    const result = await createTripAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/pedidos/${result.tripId}`);
    router.refresh();
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-lead">{t("lead")}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel panel-lift">
          <AddressAutocompleteInput
            name="pickupAddress"
            label={t("pickup")}
            placeholder={t("pickupPlaceholder")}
            required
          />
          <AddressAutocompleteInput
            name="dropoffAddress"
            label={t("dropoff")}
            placeholder={t("dropoffPlaceholder")}
            required
          />
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="pickupAt">
                {t("when")}
              </label>
              <input className="input" id="pickupAt" name="pickupAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="preferredVehicleClassId">
                {t("vehicleClass")}
              </label>
              <select className="select" id="preferredVehicleClassId" name="preferredVehicleClassId" defaultValue="">
                <option value="">{t("noPreference")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · até {c.maxPassengers} / {c.maxLuggage}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="passengers">
                {t("passengers")}
              </label>
              <input className="input" id="passengers" name="passengers" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="luggage">
                {t("luggage")}
              </label>
              <input className="input" id="luggage" name="luggage" type="number" min={0} defaultValue={1} required />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="flightNumber">
              {t("flight")}
            </label>
            <input className="input" id="flightNumber" name="flightNumber" />
          </div>
          <div className="field">
            <label className="label" htmlFor="notes">
              {t("notes")}
            </label>
            <textarea className="textarea" id="notes" name="notes" placeholder={t("notesPlaceholder")} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
