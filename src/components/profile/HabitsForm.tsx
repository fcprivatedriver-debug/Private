"use client";

import { useActionState } from "react";
import { updateHabitsAction } from "@/actions/auth";
import type { ActionState } from "@/actions/auth";
import { WEEKDAY_LABELS } from "@/config/constants";

const initial: ActionState = {};

type HabitsDefaults = {
  tripsCount: number | null;
  frequencyUnit: string;
  weekdays: string[];
  usualTimes: string;
  usualPickups: string;
  usualDestinations: string;
  oftenAirport: boolean;
  oftenRoundTrip: boolean;
  needsWaiting: boolean;
  travelsAlone: string;
  avgPassengers: number | null;
  needsChildSeat: boolean;
  oftenLuggage: boolean;
  otherPreferences: string;
};

export function HabitsForm({ defaults }: { defaults: HabitsDefaults }) {
  const [state, formAction, pending] = useActionState(updateHabitsAction, initial);

  return (
    <form action={formAction} className="panel panel-lift">
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="tripsCount">
            Viagens por período
          </label>
          <input
            className="input"
            type="number"
            id="tripsCount"
            name="tripsCount"
            min={0}
            defaultValue={defaults.tripsCount ?? ""}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="frequencyUnit">
            Período
          </label>
          <select className="select" id="frequencyUnit" name="frequencyUnit" defaultValue={defaults.frequencyUnit}>
            <option value="">—</option>
            <option value="semana">Por semana</option>
            <option value="mes">Por mês</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label className="label">Dias habituais</label>
        <div className="cta-row" style={{ flexWrap: "wrap" }}>
          {WEEKDAY_LABELS.map((day) => (
            <label key={day} className="quality-pill">
              <input
                type="checkbox"
                name="weekdays"
                value={day}
                defaultChecked={defaults.weekdays.includes(day)}
              />{" "}
              {day}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="usualTimes">
          Horários habituais
        </label>
        <input className="input" id="usualTimes" name="usualTimes" defaultValue={defaults.usualTimes} placeholder="ex.: manhãs cedo, fins de tarde" />
      </div>

      <div className="field">
        <label className="label" htmlFor="usualPickups">
          Locais de recolha frequentes
        </label>
        <textarea className="textarea" id="usualPickups" name="usualPickups" defaultValue={defaults.usualPickups} />
      </div>

      <div className="field">
        <label className="label" htmlFor="usualDestinations">
          Destinos frequentes
        </label>
        <textarea className="textarea" id="usualDestinations" name="usualDestinations" defaultValue={defaults.usualDestinations} />
      </div>

      <div className="field">
        <label className="quality-pill">
          <input type="checkbox" name="oftenAirport" defaultChecked={defaults.oftenAirport} /> Aeroporto com frequência
        </label>
      </div>
      <div className="field">
        <label className="quality-pill">
          <input type="checkbox" name="oftenRoundTrip" defaultChecked={defaults.oftenRoundTrip} /> Ida e volta habitual
        </label>
      </div>
      <div className="field">
        <label className="quality-pill">
          <input type="checkbox" name="needsWaiting" defaultChecked={defaults.needsWaiting} /> Costuma precisar de espera
        </label>
      </div>
      <div className="field">
        <label className="quality-pill">
          <input type="checkbox" name="needsChildSeat" defaultChecked={defaults.needsChildSeat} /> Cadeira de criança
        </label>
      </div>
      <div className="field">
        <label className="quality-pill">
          <input type="checkbox" name="oftenLuggage" defaultChecked={defaults.oftenLuggage} /> Bagagem frequente
        </label>
      </div>

      <div className="field">
        <label className="label">Viaja sozinho?</label>
        <div className="cta-row">
          <label className="quality-pill">
            <input type="radio" name="travelsAlone" value="yes" defaultChecked={defaults.travelsAlone === "yes"} /> Sim
          </label>
          <label className="quality-pill">
            <input type="radio" name="travelsAlone" value="no" defaultChecked={defaults.travelsAlone === "no"} /> Não
          </label>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="avgPassengers">
          Média de passageiros
        </label>
        <input
          className="input"
          type="number"
          id="avgPassengers"
          name="avgPassengers"
          min={1}
          max={8}
          defaultValue={defaults.avgPassengers ?? ""}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="otherPreferences">
          Outras preferências
        </label>
        <textarea className="textarea" id="otherPreferences" name="otherPreferences" defaultValue={defaults.otherPreferences} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "A guardar…" : "Guardar hábitos"}
      </button>
    </form>
  );
}
