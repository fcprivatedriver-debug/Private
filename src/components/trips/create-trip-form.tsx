"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vehicleClassLabels } from "@/lib/constants";
import type { VehicleClass } from "@/types";

const vehicleClasses = Object.keys(vehicleClassLabels) as VehicleClass[];

export function CreateTripForm() {
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pickup">Local de recolha</Label>
          <Input
            id="pickup"
            name="pickup"
            placeholder="Aeroporto, hotel, morada…"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="dropoff">Destino</Label>
          <Input
            id="dropoff"
            name="dropoff"
            placeholder="Morada de destino"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pickupAt">Data e hora</Label>
          <Input id="pickupAt" name="pickupAt" type="datetime-local" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="passengerCount">Passageiros</Label>
          <Input
            id="passengerCount"
            name="passengerCount"
            type="number"
            min={1}
            defaultValue={1}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de viagem</Label>
          <select
            id="type"
            name="type"
            className="flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm"
            defaultValue="one_way"
          >
            <option value="one_way">Só ida</option>
            <option value="round_trip">Ida e volta</option>
            <option value="hourly">Por hora</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleClass">Classe de veículo</Label>
          <select
            id="vehicleClass"
            name="vehicleClass"
            className="flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm"
            defaultValue="comfort"
          >
            {vehicleClasses.map((value) => (
              <option key={value} value={value}>
                {vehicleClassLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Placa de identificação, necessidades especiais…"
          />
        </div>
      </div>
      <Button type="submit">Publicar pedido</Button>
    </form>
  );
}
