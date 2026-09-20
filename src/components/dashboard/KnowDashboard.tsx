"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export type KnowCategorySlice = {
  name: string;
  color: string;
  amountCents: number;
};

export type KnowEvolutionPoint = {
  label: string;
  incomeCents: number;
  expenseCents: number;
};

export type KnowMember = { id: string; displayName: string };
export type KnowCategory = { id: string; name: string; slug: string };

export type KnowSavingsBreakdown = {
  shoppingCents: number;
  fuelCents: number;
  evCents: number;
  financeCents: number;
  organizationCents: number;
  totalCents: number;
};

export type KnowDashboardProps = {
  monthLabel: string;
  year: number;
  month: number;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  categoryChart: KnowCategorySlice[];
  evolution: KnowEvolutionPoint[];
  members: KnowMember[];
  categories: KnowCategory[];
  space: "personal" | "family";
  /** Poupança REAL (NinaImpact followed) — nunca inventar */
  savingsMonthCents: number;
  savingsAllTimeCents: number;
  savingsBreakdown: KnowSavingsBreakdown;
  /** Poupança potencial (ainda sem motor persistido → 0) */
  potentialMonthCents: number;
  activeMemberId?: string;
  /** Intervalo opcional (YYYY-MM-DD) — combina com mês/ano se vazio */
  dateFrom?: string;
  dateTo?: string;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function KnowDashboard(props: KnowDashboardProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<"all" | "income" | "expense">("all");
  const [categoryId, setCategoryId] = useState("");
  const [memberId, setMemberId] = useState(props.activeMemberId || "");
  const [periodMonth, setPeriodMonth] = useState(props.month);
  const [periodYear, setPeriodYear] = useState(props.year);
  const [dateFrom, setDateFrom] = useState(props.dateFrom || "");
  const [dateTo, setDateTo] = useState(props.dateTo || "");
  const [detailOpen, setDetailOpen] = useState(false);

  const maxEvo = useMemo(() => {
    let m = 1;
    for (const e of props.evolution) {
      m = Math.max(m, e.incomeCents, e.expenseCents);
    }
    return m;
  }, [props.evolution]);

  const catTotal = props.categoryChart.reduce((s, c) => s + c.amountCents, 0) || 1;

  function applyFilters() {
    start(() => {
      const params = new URLSearchParams();
      params.set("pane", "know");
      params.set("y", String(periodYear));
      params.set("m", String(periodMonth));
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (categoryId) params.set("cat", categoryId);
      if (memberId) params.set("member", memberId);
      if (kind !== "all") params.set("kind", kind);
      router.push(`/pt/dashboard?${params.toString()}`);
    });
  }

  const breakdownRows = [
    { label: "Compras", cents: props.savingsBreakdown.shoppingCents },
    { label: "Combustível", cents: props.savingsBreakdown.fuelCents },
    { label: "Carregamentos", cents: props.savingsBreakdown.evCents },
    { label: "Finanças", cents: props.savingsBreakdown.financeCents },
    { label: "Organização", cents: props.savingsBreakdown.organizationCents },
  ].filter((r) => r.cents > 0);

  return (
    <div className={cn("know-dash", pending && "is-pending")}>
      <header className="know-dash-head">
        <h2 className="know-title">KNOW</h2>
        <p className="know-sub muted">Percebe para onde vai o dinheiro.</p>
      </header>

      <section className="know-filters panel" aria-label="Filtros">
        <div className="panel-body know-filters-grid">
          <label className="field">
            <span>Mês</span>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Ano</span>
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
            >
              {[props.year, props.year - 1, props.year - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>De</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Até</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="all">Receitas e despesas</option>
              <option value="income">Só receitas</option>
              <option value="expense">Só despesas</option>
            </select>
          </label>
          <label className="field">
            <span>Categoria</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas</option>
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {props.space === "family" ? (
            <label className="field">
              <span>Membro</span>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="">Toda a família</option>
                {props.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters}>
            Aplicar filtros
          </button>
        </div>
        <p className="muted small know-period-label">
          Período:{" "}
          {dateFrom || dateTo
            ? `${dateFrom || "…"} → ${dateTo || "…"}`
            : `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`}
          {props.space === "family" ? " · Familiar" : " · Pessoal"}
        </p>
      </section>

      {/* 1. Poupança — destaque */}
      <button
        type="button"
        className="know-savings-card"
        onClick={() => setDetailOpen((v) => !v)}
        aria-expanded={detailOpen}
      >
        <span className="know-savings-kicker">Com Add and Know poupaste</span>
        <strong className="know-savings-main">{formatEUR(props.savingsMonthCents)}</strong>
        <span className="know-savings-period">este mês</span>
        <span className="know-savings-all">
          <strong>{formatEUR(props.savingsAllTimeCents)}</strong>
          <span> desde que começaste</span>
        </span>
      </button>

      {detailOpen ? (
        <div className="know-savings-detail panel" role="region" aria-label="Detalhe da poupança">
          <div className="panel-body">
            <h3 className="know-section-title">Poupança real</h3>
            {breakdownRows.length === 0 ? (
              <p className="muted small" style={{ margin: 0 }}>
                Ainda não há poupanças comprováveis registadas. Quando seguires uma
                recomendação da MEL (compras, combustível, …), aparece aqui.
              </p>
            ) : (
              <ul className="know-breakdown-list">
                {breakdownRows.map((r) => (
                  <li key={r.label}>
                    <span>{r.label}</span>
                    <strong>{formatEUR(r.cents)}</strong>
                  </li>
                ))}
                <li className="is-total">
                  <span>Total</span>
                  <strong>{formatEUR(props.savingsMonthCents)}</strong>
                </li>
              </ul>
            )}
            <div className="know-potential">
              <span>Poderias ter poupado mais</span>
              <strong>{formatEUR(props.potentialMonthCents)}</strong>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Receitas / Despesas / Saldo */}
      <section className="know-totals" aria-label="Totais do período">
        {(kind === "all" || kind === "income") && (
          <Link href="/pt/receitas" className="know-total-card is-income">
            <span>Receitas</span>
            <strong>{formatEUR(props.incomeCents)}</strong>
          </Link>
        )}
        {(kind === "all" || kind === "expense") && (
          <Link href="/pt/despesas" className="know-total-card is-expense">
            <span>Despesas</span>
            <strong>{formatEUR(props.expenseCents)}</strong>
          </Link>
        )}
        {kind === "all" ? (
          <div className="know-total-card is-balance">
            <span>Saldo</span>
            <strong className={props.balanceCents < 0 ? "is-neg" : undefined}>
              {formatEUR(props.balanceCents)}
            </strong>
          </div>
        ) : null}
      </section>

      {/* 3. Evolução */}
      <section className="know-evo panel">
        <div className="panel-body">
          <h3 className="know-section-title">Evolução</h3>
          <div className="know-evo-chart" role="img" aria-label="Gráfico receitas e despesas">
            {props.evolution.map((e) => (
              <div key={e.label} className="know-evo-col">
                <div className="know-evo-bars">
                  <span
                    className="know-evo-bar is-income"
                    style={{ height: `${Math.max(4, (e.incomeCents / maxEvo) * 100)}%` }}
                    title={`Receitas ${formatEUR(e.incomeCents)}`}
                  />
                  <span
                    className="know-evo-bar is-expense"
                    style={{ height: `${Math.max(4, (e.expenseCents / maxEvo) * 100)}%` }}
                    title={`Despesas ${formatEUR(e.expenseCents)}`}
                  />
                </div>
                <span className="know-evo-label">{e.label}</span>
              </div>
            ))}
          </div>
          <p className="muted small know-evo-legend">
            <span className="know-dot is-income" /> Receitas{" "}
            <span className="know-dot is-expense" /> Despesas
          </p>
        </div>
      </section>

      {/* 4. Categorias */}
      <section className="know-cats panel">
        <div className="panel-body">
          <div className="know-section-row">
            <h3 className="know-section-title">Despesas por categoria</h3>
            <Link href="/pt/despesas" className="muted small">
              Ver movimentos →
            </Link>
          </div>
          {props.categoryChart.length === 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              Sem despesas neste período.
            </p>
          ) : (
            <ul className="know-cat-list">
              {props.categoryChart.slice(0, 8).map((c) => (
                <li key={c.name}>
                  <span className="know-cat-swatch" style={{ background: c.color || "#64748b" }} />
                  <span className="know-cat-name">{c.name}</span>
                  <span className="know-cat-bar">
                    <span
                      style={{
                        width: `${Math.max(4, (c.amountCents / catTotal) * 100)}%`,
                        background: c.color || "#64748b",
                      }}
                    />
                  </span>
                  <strong>{formatEUR(c.amountCents)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="know-mel-hint muted small">
        Pergunta à MEL: «Quanto gastámos este mês?» ou «Onde poderia ter poupado?» — os valores
        vêm sempre dos teus dados reais.
      </p>
    </div>
  );
}
