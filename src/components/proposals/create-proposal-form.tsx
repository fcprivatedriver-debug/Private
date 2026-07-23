"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateProposalFormProps {
  tripId: string;
}

export function CreateProposalForm({ tripId }: CreateProposalFormProps) {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <input type="hidden" name="tripId" value={tripId} />
      <div className="space-y-2">
        <Label htmlFor="vehicleId">Veículo</Label>
        <select
          id="vehicleId"
          name="vehicleId"
          className="flex h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Selecionar veículo
          </option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">Preço (EUR)</Label>
        <Input
          id="price"
          name="price"
          type="number"
          min={1}
          step="0.01"
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Mensagem (opcional)</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Detalhes do serviço, tempo de espera incluído…"
        />
      </div>
      <Button type="submit">Enviar proposta</Button>
    </form>
  );
}
