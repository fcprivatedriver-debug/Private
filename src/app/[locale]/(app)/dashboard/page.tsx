import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { getDashboardData } from "@/lib/queries";
import { getSavingsPeriods } from "@/lib/engines/saving-engine";
import { prisma } from "@/lib/db";
import { AddKnowTabs } from "@/components/dashboard/AddKnowTabs";
import { KnowDashboard } from "@/components/dashboard/KnowDashboard";
import {
  DashExpenseIcon,
  DashIncomeIcon,
  DashMobilityIcon,
  DashScheduleIcon,
  DashShoppingIcon,
} from "@/components/dashboard/DashActionIcons";

function MelSparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden className="dash-action-icon">
      <path
        d="M12 3.5 13.2 8.8 18.5 10 13.2 11.2 12 16.5 10.8 11.2 5.5 10 10.8 8.8 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M18 14.5 18.6 16.4 20.5 17 18.6 17.6 18 19.5 17.4 17.6 15.5 17 17.4 16.4 18 14.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddPane({ firstName }: { firstName: string }) {
  return (
    <div className="add-pane">
      <header className="add-pane-head">
        <h1 className="add-pane-title">
          Olá{firstName ? ", " : ""}
          {firstName ? <span className="add-pane-name">{firstName}</span> : null}
        </h1>
        <p className="add-pane-sub">O que queres fazer?</p>
      </header>

      <div className="dash-actions">
        <Link href="/pt/despesas/nova" className="dash-action">
          <DashExpenseIcon />
          <span className="dash-action-label">Despesa</span>
          <span className="dash-action-hint">Registar um gasto</span>
        </Link>
        <Link href="/pt/receitas/nova" className="dash-action">
          <DashIncomeIcon />
          <span className="dash-action-label">Receita</span>
          <span className="dash-action-hint">Registar uma entrada</span>
        </Link>
        <Link href="/pt/calendario" className="dash-action">
          <DashScheduleIcon />
          <span className="dash-action-label">Agendar</span>
          <span className="dash-action-hint">Não esquecer</span>
        </Link>
        <Link href="/pt/mobilidade" className="dash-action">
          <DashMobilityIcon />
          <span className="dash-action-label">Mobilidade</span>
          <span className="dash-action-hint">Viagens e custos</span>
        </Link>
        <Link href="/pt/lista" className="dash-action">
          <DashShoppingIcon />
          <span className="dash-action-label">Compras</span>
          <span className="dash-action-hint">Listas e preços</span>
        </Link>
        <Link href="/pt/captura?mode=voice&auto=1" className="dash-action">
          <MelSparkleIcon />
          <span className="dash-action-label">Fala com a MEL</span>
          <span className="dash-action-hint">A tua assistente</span>
        </Link>
      </div>

      <div className="add-pane-more">
        <Link href="/pt/guia">Ver tudo →</Link>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    pane?: string;
    y?: string;
    m?: string;
    cat?: string;
    member?: string;
    kind?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");

  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const sp = (await searchParams) || {};
  const pane = sp.pane === "know" ? "know" : "add";
  const space = await getNinaSpace();
  const firstName = membership.displayName?.split(" ")[0] || "";

  const now = new Date();
  const year = Number(sp.y) || now.getFullYear();
  const month = Number(sp.m) || now.getMonth() + 1;
  const memberFilter =
    space === "family" && sp.member ? sp.member : space === "personal" ? membership.id : "";
  const dateFrom = sp.from?.trim() || "";
  const dateTo = sp.to?.trim() || "";
  const useCustomRange = Boolean(dateFrom || dateTo);

  // getDashboardData usa mês corrente — para filtros custom usamos agregados directos
  const dash = await getDashboardData(membership.familyId, {
    space,
    memberId: memberFilter || membership.id,
  });

  // Se o período pedido for o mês actual, reutilizar dash; senão recalcular totais
  const isCurrentMonth = !useCustomRange && year === dash.year && month === dash.month;
  let incomeCents = dash.totals.incomeCents;
  let expenseCents = dash.totals.expenseCents;
  // groupByCategory devolve `cents`; KnowDashboard espera `amountCents`
  let categoryChart = dash.categoryChart.map((c) => ({
    name: c.name,
    color: c.color,
    amountCents: c.cents,
  }));
  const evolution = dash.evolution;

  if (!isCurrentMonth || useCustomRange) {
    const { monthBounds } = await import("@/lib/money");
    const { expenseScopeWhere, incomeScopeWhere } = await import("@/lib/scope");
    let start: Date;
    let end: Date;
    if (useCustomRange) {
      start = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(year, month - 1, 1);
      end = dateTo
        ? new Date(`${dateTo}T23:59:59`)
        : new Date(year, month, 0, 23, 59, 59);
    } else {
      ({ start, end } = monthBounds(year, month));
    }
    const expWhere = expenseScopeWhere(space, memberFilter || membership.id);
    const incWhere = incomeScopeWhere(space, memberFilter || membership.id);
    const catFilter = sp.cat ? { categoryId: sp.cat } : {};

    const [incAgg, expRows] = await Promise.all([
      prisma.income.aggregate({
        where: { familyId: membership.familyId, date: { gte: start, lte: end }, ...incWhere },
        _sum: { amountCents: true },
      }),
      prisma.expense.findMany({
        where: {
          familyId: membership.familyId,
          date: { gte: start, lte: end },
          ...expWhere,
          ...catFilter,
        },
        select: {
          amountCents: true,
          category: { select: { name: true, color: true } },
        },
      }),
    ]);
    incomeCents = incAgg._sum.amountCents ?? 0;
    expenseCents = expRows.reduce((s, e) => s + e.amountCents, 0);
    const map = new Map<string, { name: string; color: string; amountCents: number }>();
    for (const e of expRows) {
      const prev = map.get(e.category.name);
      if (prev) prev.amountCents += e.amountCents;
      else map.set(e.category.name, { name: e.category.name, color: e.category.color, amountCents: e.amountCents });
    }
    categoryChart = [...map.values()].sort((a, b) => b.amountCents - a.amountCents);
  } else if (sp.cat) {
    // Filtrar categorias no mês actual
    const filtered = await prisma.expense.findMany({
      where: {
        familyId: membership.familyId,
        categoryId: sp.cat,
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0, 23, 59, 59),
        },
        ...(space === "family"
          ? { scope: "FAMILY" as const }
          : { scope: "PERSONAL" as const, memberId: membership.id }),
        ...(sp.member && space === "family" ? { memberId: sp.member } : {}),
      },
      select: {
        amountCents: true,
        category: { select: { name: true, color: true } },
      },
    });
    expenseCents = filtered.reduce((s, e) => s + e.amountCents, 0);
    const map = new Map<string, { name: string; color: string; amountCents: number }>();
    for (const e of filtered) {
      const prev = map.get(e.category.name);
      if (prev) prev.amountCents += e.amountCents;
      else
        map.set(e.category.name, {
          name: e.category.name,
          color: e.category.color,
          amountCents: e.amountCents,
        });
    }
    categoryChart = [...map.values()].sort((a, b) => b.amountCents - a.amountCents);
  }

  if (sp.kind === "income") {
    expenseCents = 0;
    categoryChart = [];
  } else if (sp.kind === "expense") {
    incomeCents = 0;
  }

  const balanceCents = incomeCents - expenseCents;

  const [savings, categories] = await Promise.all([
    getSavingsPeriods(membership.familyId).catch(() => null),
    prisma.category.findMany({
      where: { familyId: membership.familyId, kind: "EXPENSE" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const savingsMonthCents = savings?.monthly.totalCents ?? 0;
  const savingsBreakdown = savings?.monthly ?? {
    shoppingCents: 0,
    fuelCents: 0,
    evCents: 0,
    financeCents: 0,
    organizationCents: 0,
    totalCents: 0,
    timeMinutes: 0,
  };

  // Poupança desde o início = NinaImpact followed (nunca inventar)
  let savingsAllTimeCents = 0;
  try {
    const allTime = await prisma.ninaImpact.aggregate({
      where: { familyId: membership.familyId, followed: true },
      _sum: { amountCents: true },
    });
    savingsAllTimeCents = allTime._sum.amountCents ?? 0;
  } catch {
    savingsAllTimeCents = savings?.yearly.totalCents ?? 0;
  }

  // Potencial: sem registo persistido de oportunidades não seguidas → 0 (nunca inventar)
  const potentialMonthCents = 0;

  return (
    <div className="home-add-know">
      <Suspense fallback={<div className="muted">A carregar…</div>}>
        <AddKnowTabs
          initialPane={pane}
          addChildren={<AddPane firstName={firstName} />}
          knowChildren={
            <KnowDashboard
              monthLabel={dash.monthLabel}
              year={year}
              month={month}
              incomeCents={incomeCents}
              expenseCents={expenseCents}
              balanceCents={balanceCents}
              categoryChart={categoryChart}
              evolution={evolution}
              members={dash.members}
              categories={categories}
              space={space}
              savingsMonthCents={savingsMonthCents}
              savingsAllTimeCents={savingsAllTimeCents}
              savingsBreakdown={savingsBreakdown}
              potentialMonthCents={potentialMonthCents}
              activeMemberId={sp.member}
              dateFrom={dateFrom || undefined}
              dateTo={dateTo || undefined}
            />
          }
        />
      </Suspense>
    </div>
  );
}
