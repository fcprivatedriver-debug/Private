"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVehicleClassAction,
  updateVehicleClassAction,
  deactivateVehicleClassAction,
} from "@/actions/vehicle-class";

export type AdminVehicleClass = {
  id: string;
  code: string;
  namePt: string;
  nameEn: string;
  descriptionPt: string | null;
  descriptionEn: string | null;
  minPassengers: number;
  maxPassengers: number;
  maxLuggage: number;
  iconKey: string | null;
  sortOrder: number;
  active: boolean;
};

function ClassFormFields({
  initial,
}: {
  initial?: Partial<AdminVehicleClass>;
}) {
  return (
    <>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="code">
            Code
          </label>
          <input className="input" id="code" name="code" defaultValue={initial?.code} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="sortOrder">
            Sort order
          </label>
          <input
            className="input"
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={initial?.sortOrder ?? 100}
          />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="namePt">
            Name (PT)
          </label>
          <input className="input" id="namePt" name="namePt" defaultValue={initial?.namePt} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="nameEn">
            Name (EN)
          </label>
          <input className="input" id="nameEn" name="nameEn" defaultValue={initial?.nameEn} required />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="descriptionPt">
            Description (PT)
          </label>
          <textarea className="textarea" id="descriptionPt" name="descriptionPt" defaultValue={initial?.descriptionPt || ""} />
        </div>
        <div className="field">
          <label className="label" htmlFor="descriptionEn">
            Description (EN)
          </label>
          <textarea className="textarea" id="descriptionEn" name="descriptionEn" defaultValue={initial?.descriptionEn || ""} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="minPassengers">
            Min passengers
          </label>
          <input
            className="input"
            id="minPassengers"
            name="minPassengers"
            type="number"
            defaultValue={initial?.minPassengers ?? 1}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="maxPassengers">
            Max passengers
          </label>
          <input
            className="input"
            id="maxPassengers"
            name="maxPassengers"
            type="number"
            defaultValue={initial?.maxPassengers ?? 3}
            required
          />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="maxLuggage">
            Max luggage
          </label>
          <input
            className="input"
            id="maxLuggage"
            name="maxLuggage"
            type="number"
            defaultValue={initial?.maxLuggage ?? 2}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="iconKey">
            Icon key
          </label>
          <input className="input" id="iconKey" name="iconKey" defaultValue={initial?.iconKey || ""} />
        </div>
      </div>
      <label className="muted" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} /> Active
      </label>
    </>
  );
}

export function VehicleClassAdminPanel({ classes }: { classes: AdminVehicleClass[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createVehicleClassAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="list-stack" style={{ marginTop: "1rem" }}>
      {error && <div className="alert alert-error">{error}</div>}

      {classes.map((c) => (
        <div key={c.id} className="list-item">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
            <strong>
              {c.code} · {c.namePt} / {c.nameEn}
            </strong>
            <span className="badge">{c.active ? "Active" : "Inactive"}</span>
          </div>
          <div className="muted">
            {c.minPassengers}–{c.maxPassengers} pax · {c.maxLuggage} bags · order {c.sortOrder}
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              const result = await updateVehicleClassAction(c.id, new FormData(e.currentTarget));
              setLoading(false);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            }}
            className="panel"
            style={{ marginTop: "0.75rem" }}
          >
            <ClassFormFields initial={c} />
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                Save
              </button>
              {c.active && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    await deactivateVehicleClassAction(c.id);
                    setLoading(false);
                    router.refresh();
                  }}
                >
                  Deactivate
                </button>
              )}
            </div>
          </form>
        </div>
      ))}

      <form onSubmit={onCreate} className="panel">
        <h3 className="font-display" style={{ marginTop: 0 }}>
          Add vehicle class
        </h3>
        <ClassFormFields />
        <button className="btn btn-primary" type="submit" disabled={loading}>
          Create class
        </button>
      </form>
    </div>
  );
}
