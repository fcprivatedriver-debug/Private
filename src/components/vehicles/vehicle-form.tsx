"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { vehicleClassLabels } from "@/lib/constants";
import type { VehicleClass } from "@/types";

const vehicleClasses = Object.keys(vehicleClassLabels) as VehicleClass[];

export function VehicleForm() {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="make">Marca</Label>
          <Input id="make" name="make" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Ano</Label>
          <Input id="year" name="year" type="number" min={1990} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Cor</Label>
          <Input id="color" name="color" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plateNumber">Matrícula</Label>
          <Input id="plateNumber" name="plateNumber" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vehicleClass">Classe</Label>
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
        <div className="space-y-2">
          <Label htmlFor="seats">Lugares</Label>
          <Input id="seats" name="seats" type="number" min={1} defaultValue={4} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="luggageCapacity">Bagagem</Label>
          <Input
            id="luggageCapacity"
            name="luggageCapacity"
            type="number"
            min={0}
            defaultValue={2}
          />
        </div>
      </div>
      <Button type="submit">Guardar veículo</Button>
    </form>
  );
}
