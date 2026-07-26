"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSavingPot,
  contributeToPot,
  setPotInvestment,
  createLifeGoal,
  addGoalItem,
  removeGoalItem,
  runSavingsSimulation,
  transferToSavings,
} from "@/actions/savings";
import { contributeToGoal } from "@/actions/finance";
import {
  SAVING_KIND_PRESETS,
  INVESTMENT_VEHICLE_LABELS,
  ACCOUNT_KIND_LABELS,
  GOAL_PRIORITY_LABELS,
} from "@/domain/investments";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SavingPotForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createSavingPot(fd);
          router.refresh();
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required placeholder="Ex: Fundo de Emergência" list="saving-presets" />
        <datalist id="saving-presets">
          {SAVING_KIND_PRESETS.map((p) => (
            <option key={p.kind} value={p.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Tipo">
        <select name="kind" defaultValue="CUSTOM">
          {SAVING_KIND_PRESETS.map((p) => (
            <option key={p.kind} value={p.kind}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Conta associada">
        <select name="accountKind" defaultValue="PERSONAL">
          {Object.entries(ACCOUNT_KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Valor atual (€)">
        <input name="current" placeholder="0,00" inputMode="decimal" />
      </Field>
      <Field label="Valor objetivo (€)">
        <input name="target" required placeholder="5000,00" inputMode="decimal" />
      </Field>
      <Field label="Data prevista">
        <input name="deadline" type="date" />
      </Field>
      <Field label="Observações">
        <textarea name="notes" rows={2} />
      </Field>
      <button className="btn btn-success" disabled={pending} type="submit">
        Criar poupança
      </button>
    </form>
  );
}

export function PotContributeForm({ potId }: { potId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await contributeToPot(potId, String(fd.get("amount") || ""));
          router.refresh();
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <input name="amount" placeholder="€" required inputMode="decimal" />
      <button className="btn btn-sm btn-success" disabled={pending} type="submit">
        +
      </button>
    </form>
  );
}

export function InvestmentForm({ potId, defaultCapital }: { potId: string; defaultCapital?: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const defaultDate = new Date().toISOString().slice(0, 10);
  return (
    <form
      className="form-grid form-grid-compact"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("potId", potId);
        start(async () => {
          await setPotInvestment(fd);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="potId" value={potId} />
      <Field label="Tipo de investimento">
        <select name="investmentVehicle" defaultValue="INTEREST_ACCOUNT">
          {Object.entries(INVESTMENT_VEHICLE_LABELS)
            .filter(([k]) => k !== "NONE")
            .map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Capital investido (€)">
        <input
          name="investedCapital"
          required
          defaultValue={defaultCapital != null ? (defaultCapital / 100).toFixed(2).replace(".", ",") : ""}
          inputMode="decimal"
        />
      </Field>
      <Field label="Taxa anual (%)">
        <input name="annualRatePercent" required placeholder="3,5" inputMode="decimal" defaultValue="3.5" />
      </Field>
      <Field label="Capitalização">
        <select name="capitalization" defaultValue="COMPOUND">
          <option value="SIMPLE">Simples</option>
          <option value="COMPOUND">Composta</option>
        </select>
      </Field>
      <Field label="Periodicidade dos juros">
        <select name="interestPeriod" defaultValue="YEARLY">
          <option value="MONTHLY">Mensal</option>
          <option value="QUARTERLY">Trimestral</option>
          <option value="SEMIANNUAL">Semestral</option>
          <option value="YEARLY">Anual</option>
          <option value="AT_MATURITY">No vencimento</option>
        </select>
      </Field>
      <Field label="Data de início">
        <input name="investmentStartDate" type="date" required defaultValue={defaultDate} />
      </Field>
      <button className="btn btn-primary btn-sm" disabled={pending} type="submit">
        Guardar investimento
      </button>
    </form>
  );
}

export function LifeGoalForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [items, setItems] = useState<{ name: string; amount: string }[]>([
    { name: "", amount: "" },
  ]);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const clean = items.filter((i) => i.name.trim() && i.amount.trim());
        if (clean.length) fd.set("itemsJson", JSON.stringify(clean));
        start(async () => {
          await createLifeGoal(fd);
          router.refresh();
          (e.target as HTMLFormElement).reset();
          setItems([{ name: "", amount: "" }]);
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required placeholder="Ex: Férias" />
      </Field>
      <Field label="Descrição">
        <textarea name="description" rows={2} placeholder="O que queres alcançar" />
      </Field>
      <Field label="Prioridade">
        <select name="priority" defaultValue="MEDIUM">
          {Object.entries(GOAL_PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Conta associada">
        <select name="accountKind" defaultValue="FAMILY">
          {Object.entries(ACCOUNT_KIND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tipo">
        <select name="type" defaultValue="CUSTOM">
          <option value="VACATION">Férias</option>
          <option value="CAR">Carro</option>
          <option value="HOUSE">Casa</option>
          <option value="EMERGENCY">Emergência</option>
          <option value="EDUCATION">Estudos</option>
          <option value="RETIREMENT">Reforma</option>
          <option value="CUSTOM">Personalizado</option>
        </select>
      </Field>
      <Field label="Valor necessário (€) — se não usares itens">
        <input name="target" placeholder="1540,00" inputMode="decimal" />
      </Field>
      <Field label="Já reservado (€)">
        <input name="current" placeholder="0,00" inputMode="decimal" />
      </Field>
      <Field label="Data pretendida">
        <input name="deadline" type="date" />
      </Field>

      <div className="goal-items-editor">
        <p className="muted small" style={{ marginBottom: "0.5rem" }}>
          Componentes do objetivo (opcional) — o total calcula-se sozinho
        </p>
        {items.map((it, idx) => (
          <div key={idx} className="inline-form" style={{ marginBottom: "0.35rem" }}>
            <input
              placeholder="Item (ex: Hotel)"
              value={it.name}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], name: e.target.value };
                setItems(next);
              }}
            />
            <input
              placeholder="€"
              inputMode="decimal"
              value={it.amount}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], amount: e.target.value };
                setItems(next);
              }}
              style={{ maxWidth: "6rem" }}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setItems([...items, { name: "", amount: "" }])}
        >
          + Item
        </button>
      </div>

      <button className="btn btn-success" disabled={pending} type="submit">
        Criar objetivo
      </button>
    </form>
  );
}

export function GoalItemForm({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("goalId", goalId);
        start(async () => {
          await addGoalItem(fd);
          router.refresh();
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <input type="hidden" name="goalId" value={goalId} />
      <input name="name" placeholder="Item" required />
      <input name="amount" placeholder="€" required inputMode="decimal" style={{ maxWidth: "5rem" }} />
      <button className="btn btn-sm btn-ghost" disabled={pending} type="submit">
        +
      </button>
    </form>
  );
}

export function RemoveGoalItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await removeGoalItem(itemId);
          router.refresh();
        })
      }
    >
      ×
    </button>
  );
}

export function GoalContributeForm({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await contributeToGoal(goalId, String(fd.get("amount") || ""));
          router.refresh();
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <input name="amount" placeholder="Reservar €" required inputMode="decimal" />
      <button className="btn btn-sm btn-success" disabled={pending} type="submit">
        +
      </button>
    </form>
  );
}

export function QuickTransferForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="form-grid form-grid-compact"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await transferToSavings(
            String(fd.get("hint") || ""),
            String(fd.get("amount") || ""),
          );
          setMsg(res.ok ? `Transferido para “${res.targetName}”.` : res.error);
          router.refresh();
        });
      }}
    >
      <Field label="Para onde? (nome da poupança/objetivo)">
        <input name="hint" required placeholder="férias, emergência…" />
      </Field>
      <Field label="Valor (€)">
        <input name="amount" required inputMode="decimal" placeholder="100" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Transferir
      </button>
      {msg ? <p className="muted small">{msg}</p> : null}
    </form>
  );
}

export function SimulatorForm({
  targets,
}: {
  targets: { id: string; name: string; kind: "pot" | "goal" }[];
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  if (!targets.length) {
    return <p className="muted">Cria uma poupança ou objetivo para simular.</p>;
  }
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const raw = String(fd.get("target") || "");
        const [kind, id] = raw.split(":");
        start(async () => {
          const res = await runSavingsSimulation({
            targetId: id,
            targetKind: kind as "pot" | "goal",
            monthlyEuros: String(fd.get("monthly") || "") || undefined,
            withdrawEuros: String(fd.get("withdraw") || "") || undefined,
          });
          setResult(res.ok ? res.text : res.error);
        });
      }}
    >
      <Field label="Alvo">
        <select name="target" defaultValue={`${targets[0].kind}:${targets[0].id}`}>
          {targets.map((t) => (
            <option key={`${t.kind}-${t.id}`} value={`${t.kind}:${t.id}`}>
              {t.kind === "pot" ? "Poupança" : "Objetivo"} · {t.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Se eu poupar por mês (€)">
        <input name="monthly" placeholder="150" inputMode="decimal" />
      </Field>
      <Field label="Se retirar desta poupança (€)">
        <input name="withdraw" placeholder="500" inputMode="decimal" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Simular agora
      </button>
      {result ? (
        <p className="nina-sim-result" style={{ whiteSpace: "pre-wrap" }}>
          {result}
        </p>
      ) : null}
    </form>
  );
}
