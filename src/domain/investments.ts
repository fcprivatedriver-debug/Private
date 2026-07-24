import type { Capitalization, InterestPeriod } from "@prisma/client";

export const INVESTMENT_VEHICLE_LABELS: Record<string, string> = {
  NONE: "Sem investimento",
  TERM_DEPOSIT: "Depósito a prazo",
  SAVINGS_CERTIFICATES: "Certificados de Aforro",
  ETF: "ETF",
  INVESTMENT_FUND: "Fundo de Investimento",
  INTEREST_ACCOUNT: "Conta remunerada",
  OTHER: "Outro investimento",
};

export const CAPITALIZATION_LABELS: Record<string, string> = {
  SIMPLE: "Simples",
  COMPOUND: "Composta",
};

export const INTEREST_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  YEARLY: "Anual",
  AT_MATURITY: "No vencimento",
};

export const ACCOUNT_KIND_LABELS: Record<string, string> = {
  PERSONAL: "Pessoal",
  FAMILY: "Familiar",
  BUSINESS: "Empresa",
};

export const GOAL_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const SAVING_KIND_PRESETS = [
  { kind: "EMERGENCY", name: "Fundo de Emergência" },
  { kind: "VACATION", name: "Férias" },
  { kind: "CAR", name: "Carro Novo" },
  { kind: "HOUSE", name: "Entrada para Casa" },
  { kind: "EDUCATION", name: "Estudos" },
  { kind: "RETIREMENT", name: "Reforma" },
  { kind: "OTHER", name: "Outros" },
  { kind: "CUSTOM", name: "Personalizado" },
] as const;

export const GOAL_NAME_PRESETS = [
  "Férias",
  "Comprar carro",
  "Remodelar a cozinha",
  "Casamento",
  "Novo computador",
  "Entrada para casa",
  "Reserva de emergência",
] as const;

function periodsPerYear(period: InterestPeriod | null | undefined): number {
  switch (period) {
    case "MONTHLY":
      return 12;
    case "QUARTERLY":
      return 4;
    case "SEMIANNUAL":
      return 2;
    case "YEARLY":
    case "AT_MATURITY":
    default:
      return 1;
  }
}

export function yearsBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 365.25));
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** Valor futuro com capitalização simples ou composta. */
export function futureValue(input: {
  principalCents: number;
  annualRatePercent: number;
  years: number;
  capitalization?: Capitalization | null;
  interestPeriod?: InterestPeriod | null;
}): number {
  const P = Math.max(0, input.principalCents);
  const r = Math.max(0, input.annualRatePercent) / 100;
  const t = Math.max(0, input.years);
  if (P <= 0 || r === 0 || t === 0) return Math.round(P);

  if (input.capitalization === "SIMPLE" || input.interestPeriod === "AT_MATURITY") {
    return Math.round(P * (1 + r * t));
  }

  const n = periodsPerYear(input.interestPeriod);
  return Math.round(P * Math.pow(1 + r / n, n * t));
}

export type InvestmentSnapshot = {
  principalCents: number;
  estimatedValueCents: number;
  accruedInterestCents: number;
  returnPercent: number;
  projections: { label: string; months: number; valueCents: number }[];
};

export function computeInvestmentSnapshot(input: {
  investedCapitalCents: number;
  annualRatePercent: number;
  capitalization?: Capitalization | null;
  interestPeriod?: InterestPeriod | null;
  startDate: Date;
  asOf?: Date;
}): InvestmentSnapshot {
  const asOf = input.asOf ?? new Date();
  const yearsElapsed = yearsBetween(input.startDate, asOf);
  const estimatedValueCents = futureValue({
    principalCents: input.investedCapitalCents,
    annualRatePercent: input.annualRatePercent,
    years: yearsElapsed,
    capitalization: input.capitalization,
    interestPeriod: input.interestPeriod,
  });
  const accruedInterestCents = Math.max(0, estimatedValueCents - input.investedCapitalCents);
  const returnPercent =
    input.investedCapitalCents > 0
      ? Math.round((accruedInterestCents / input.investedCapitalCents) * 1000) / 10
      : 0;

  const horizons = [
    { label: "6 meses", months: 6 },
    { label: "1 ano", months: 12 },
    { label: "5 anos", months: 60 },
    { label: "10 anos", months: 120 },
  ];

  const projections = horizons.map((h) => ({
    label: h.label,
    months: h.months,
    valueCents: futureValue({
      principalCents: input.investedCapitalCents,
      annualRatePercent: input.annualRatePercent,
      years: yearsElapsed + h.months / 12,
      capitalization: input.capitalization,
      interestPeriod: input.interestPeriod,
    }),
  }));

  return {
    principalCents: input.investedCapitalCents,
    estimatedValueCents,
    accruedInterestCents,
    returnPercent,
    projections,
  };
}

/** Meses necessários a poupar X €/mês para atingir o valor em falta. */
export function monthsToReach(remainingCents: number, monthlySaveCents: number): number | null {
  if (remainingCents <= 0) return 0;
  if (monthlySaveCents <= 0) return null;
  return Math.ceil(remainingCents / monthlySaveCents);
}

export function dateAfterMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function remainingAfterWithdraw(currentCents: number, withdrawCents: number): number {
  return Math.max(0, currentCents - Math.max(0, withdrawCents));
}
