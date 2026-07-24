"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createIncome,
  createExpense,
  updateIncome,
  updateExpense,
  createBudget,
  createGoal,
  createRecurring,
  createCategory,
  contributeToGoal,
  addFamilyMember,
} from "@/actions/finance";
import { PAYMENT_METHOD_LABELS, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@/domain/categories";

type Cat = { id: string; name: string; kind: string; slug?: string };
type Acc = { id: string; name: string };
type Mem = { id: string; displayName: string };

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function incomeOptions(categories: Cat[]) {
  const fromDb = categories.filter((c) => c.kind === "INCOME");
  if (fromDb.length > 0) {
    return fromDb.map((c) => ({ value: c.id, label: c.name }));
  }
  return DEFAULT_INCOME_CATEGORIES.map((c) => ({ value: c.slug, label: c.name }));
}

function expenseOptions(categories: Cat[]) {
  const fromDb = categories.filter((c) => c.kind === "EXPENSE");
  if (fromDb.length > 0) {
    return fromDb.map((c) => ({ value: c.id, label: c.name }));
  }
  return DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ value: c.slug, label: c.name }));
}

export function IncomeForm({
  categories,
  accounts,
  members,
  initial,
}: {
  categories: Cat[];
  accounts: Acc[];
  members: Mem[];
  initial?: {
    id: string;
    amountCents: number;
    date: string;
    description: string;
    categoryId: string;
    accountId: string | null;
    memberId: string | null;
    notes: string | null;
    scope?: "PERSONAL" | "FAMILY";
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const options = incomeOptions(categories);
  const editing = Boolean(initial?.id);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = editing ? await updateIncome(fd) : await createIncome(fd);
          if (!res.ok) setError(res.error);
          else router.push("/pt/receitas");
        });
      }}
    >
      {editing ? <input type="hidden" name="id" value={initial!.id} /> : null}
      <Field label="Tipo de receita">
        <select name="categoryId" required defaultValue={initial?.categoryId ?? options[0]?.value}>
          {options.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição">
        <input
          name="description"
          required
          placeholder="Ex: Salário março"
          defaultValue={initial?.description}
        />
      </Field>
      <Field label="Valor (€)">
        <input
          name="amount"
          required
          placeholder="0,00"
          inputMode="decimal"
          defaultValue={
            initial ? (initial.amountCents / 100).toFixed(2).replace(".", ",") : undefined
          }
        />
      </Field>
      <Field label="Data">
        <input
          name="date"
          type="date"
          required
          defaultValue={initial?.date ?? new Date().toISOString().slice(0, 10)}
        />
      </Field>
      <Field label="Conta (Pessoal / Familiar)">
        <select name="scope" defaultValue={initial?.scope ?? "PERSONAL"}>
          <option value="PERSONAL">Pessoal</option>
          <option value="FAMILY">Familiar</option>
        </select>
      </Field>
      <Field label="Conta bancária">
        <select name="accountId" defaultValue={initial?.accountId ?? accounts[0]?.id ?? ""}>
          <option value="">—</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Membro">
        <select name="memberId" defaultValue={initial?.memberId ?? members[0]?.id}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Observações">
        <textarea name="notes" rows={3} placeholder="Opcional" defaultValue={initial?.notes ?? ""} />
      </Field>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-success" disabled={pending} type="submit">
        {pending ? "A guardar…" : editing ? "Guardar alterações" : "Guardar receita"}
      </button>
    </form>
  );
}

export function ExpenseForm({
  categories,
  accounts,
  members,
  defaults,
  initial,
}: {
  categories: Cat[];
  accounts: Acc[];
  members: Mem[];
  defaults?: Partial<{
    amount: string;
    date: string;
    description: string;
    categoryId: string;
    storeName: string;
  }>;
  initial?: {
    id: string;
    amountCents: number;
    date: string;
    time: string | null;
    description: string;
    categoryId: string;
    subcategoryId: string | null;
    storeName: string | null;
    paymentMethod: string;
    accountId: string | null;
    memberId: string | null;
    notes: string | null;
    receiptImageUrl: string | null;
    receiptPdfUrl: string | null;
    scope?: "PERSONAL" | "FAMILY";
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const expenseCats = categories.filter((c) => c.kind === "EXPENSE");
  const options = expenseOptions(categories);
  const editing = Boolean(initial?.id);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = editing ? await updateExpense(fd) : await createExpense(fd);
          if (!res.ok) setError(res.error);
          else router.push("/pt/despesas");
        });
      }}
    >
      {editing ? <input type="hidden" name="id" value={initial!.id} /> : null}
      <Field label="Valor (€)">
        <input
          name="amount"
          required
          placeholder="0,00"
          inputMode="decimal"
          defaultValue={
            initial
              ? (initial.amountCents / 100).toFixed(2).replace(".", ",")
              : defaults?.amount
          }
        />
      </Field>
      <Field label="Data">
        <input
          name="date"
          type="date"
          required
          defaultValue={initial?.date ?? defaults?.date ?? new Date().toISOString().slice(0, 10)}
        />
      </Field>
      <Field label="Hora">
        <input
          name="time"
          type="time"
          defaultValue={initial?.time ?? new Date().toTimeString().slice(0, 5)}
        />
      </Field>
      <Field label="Descrição">
        <input
          name="description"
          required
          placeholder="Ex: Compras Continente"
          defaultValue={initial?.description ?? defaults?.description}
        />
      </Field>
      <Field label="Categoria">
        <select
          name="categoryId"
          required
          defaultValue={initial?.categoryId ?? defaults?.categoryId ?? options[0]?.value}
        >
          {options.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Subcategoria">
        <select name="subcategoryId" defaultValue={initial?.subcategoryId ?? ""}>
          <option value="">—</option>
          {expenseCats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Conta (Pessoal / Familiar)">
        <select name="scope" defaultValue={initial?.scope ?? "PERSONAL"}>
          <option value="PERSONAL">Pessoal</option>
          <option value="FAMILY">Familiar</option>
        </select>
      </Field>
      <Field label="Loja">
        <input
          name="storeName"
          placeholder="Ex: Continente"
          defaultValue={initial?.storeName ?? defaults?.storeName ?? ""}
        />
      </Field>
      <Field label="Método de pagamento">
        <select name="paymentMethod" defaultValue={initial?.paymentMethod ?? "DEBIT_CARD"}>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Conta bancária">
        <select name="accountId" defaultValue={initial?.accountId ?? ""}>
          <option value="">—</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Membro">
        <select name="memberId" defaultValue={initial?.memberId ?? members[0]?.id}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="URL fotografia fatura">
        <input
          name="receiptImageUrl"
          placeholder="https://…"
          defaultValue={initial?.receiptImageUrl ?? ""}
        />
      </Field>
      <Field label="URL PDF fatura">
        <input name="receiptPdfUrl" placeholder="https://…" defaultValue={initial?.receiptPdfUrl ?? ""} />
      </Field>
      <Field label="Observações">
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} />
      </Field>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "A guardar…" : editing ? "Guardar alterações" : "Guardar despesa"}
      </button>
    </form>
  );
}

export function BudgetForm({ categories, year, month }: { categories: Cat[]; year: number; month: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid form-grid-compact"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createBudget(fd);
          router.refresh();
        });
      }}
    >
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <Field label="Categoria">
        <select name="categoryId" required>
          {categories.filter((c) => c.kind === "EXPENSE").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Limite mensal (€)">
        <input name="limit" required placeholder="250,00" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Definir orçamento
      </button>
    </form>
  );
}

export function GoalForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createGoal(fd);
          router.refresh();
          (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required placeholder="Ex: Férias" />
      </Field>
      <Field label="Tipo">
        <select name="type" defaultValue="CUSTOM">
          <option value="CAR">Carro</option>
          <option value="HOUSE">Casa</option>
          <option value="VACATION">Férias</option>
          <option value="EMERGENCY">Emergência</option>
          <option value="INVESTMENT">Investimentos</option>
          <option value="RETIREMENT">Reforma</option>
          <option value="CUSTOM">Personalizado</option>
        </select>
      </Field>
      <Field label="Meta (€)">
        <input name="target" required placeholder="2500,00" />
      </Field>
      <Field label="Já poupado (€)">
        <input name="current" placeholder="0,00" />
      </Field>
      <Field label="Prazo">
        <input name="deadline" type="date" />
      </Field>
      <Field label="Notas">
        <textarea name="notes" rows={2} />
      </Field>
      <button className="btn btn-success" disabled={pending} type="submit">
        Criar objetivo
      </button>
    </form>
  );
}

export function ContributeForm({ goalId }: { goalId: string }) {
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

export function RecurringForm({ categories, accounts }: { categories: Cat[]; accounts: Acc[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createRecurring(fd);
          router.refresh();
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required placeholder="Ex: Netflix" list="recurring-presets" />
        <datalist id="recurring-presets">
          {["Renda", "Água", "Luz", "Gás", "Internet", "Netflix", "Spotify", "Seguros", "Ginásio"].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>
      <Field label="Valor (€)">
        <input name="amount" required />
      </Field>
      <Field label="Categoria">
        <select name="categoryId" required>
          {categories.filter((c) => c.kind === "EXPENSE").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Frequência">
        <select name="frequency" defaultValue="MONTHLY">
          <option value="WEEKLY">Semanal</option>
          <option value="MONTHLY">Mensal</option>
          <option value="QUARTERLY">Trimestral</option>
          <option value="YEARLY">Anual</option>
        </select>
      </Field>
      <Field label="Dia do mês">
        <input name="dayOfMonth" type="number" min={1} max={28} defaultValue={1} />
      </Field>
      <Field label="Próximo pagamento">
        <input name="nextDueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </Field>
      <Field label="Método">
        <select name="paymentMethod" defaultValue="DIRECT_DEBIT">
          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      <Field label="Conta">
        <select name="accountId">
          <option value="">—</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Criar recorrente
      </button>
    </form>
  );
}

export function CategoryForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid form-grid-compact"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await createCategory(fd);
          router.refresh();
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required />
      </Field>
      <Field label="Tipo">
        <select name="kind" defaultValue="EXPENSE">
          <option value="EXPENSE">Despesa</option>
          <option value="INCOME">Receita</option>
        </select>
      </Field>
      <Field label="Cor">
        <input name="color" type="color" defaultValue="#1e3a5f" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Criar categoria
      </button>
    </form>
  );
}

export function MemberForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="form-grid form-grid-compact"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await addFamilyMember(fd);
          router.refresh();
        });
      }}
    >
      <Field label="Nome">
        <input name="name" required />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required />
      </Field>
      <Field label="Password inicial">
        <input name="password" type="password" defaultValue="nina123" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        Adicionar membro
      </button>
    </form>
  );
}
