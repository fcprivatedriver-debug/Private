/** Visual tier tokens for subscription cards */
export const PLAN_TIERS = {
  bronze: {
    key: "bronze",
    labelPt: "Bronze",
    labelEn: "Bronze",
    emoji: "🟤",
    accent: "#8B5E3C",
    accentSoft: "#F3E8DF",
    ink: "#3E2723",
    border: "#C49A6C",
  },
  silver: {
    key: "silver",
    labelPt: "Prata",
    labelEn: "Silver",
    emoji: "⚪",
    accent: "#6B7280",
    accentSoft: "#F3F4F6",
    ink: "#1F2937",
    border: "#9CA3AF",
  },
  gold: {
    key: "gold",
    labelPt: "Ouro",
    labelEn: "Gold",
    emoji: "🟡",
    accent: "#B45309",
    accentSoft: "#FEF3C7",
    ink: "#78350F",
    border: "#D97706",
  },
  diamond: {
    key: "diamond",
    labelPt: "Diamante",
    labelEn: "Diamond",
    emoji: "💎",
    accent: "#0A4F5C",
    accentSoft: "#E6F1F3",
    ink: "#073A44",
    border: "#4A7F89",
  },
  custom: {
    key: "custom",
    labelPt: "Personalizado",
    labelEn: "Custom",
    emoji: "✦",
    accent: "#0A4F5C",
    accentSoft: "#E6F1F3",
    ink: "#1A1A1A",
    border: "#0A4F5C",
  },
} as const;

export type PlanTierKey = keyof typeof PLAN_TIERS;

export function resolvePlanTier(tier?: string | null) {
  const key = (tier || "custom").toLowerCase() as PlanTierKey;
  return PLAN_TIERS[key] || PLAN_TIERS.custom;
}

export const DIAMOND_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Recebido",
  UNDER_REVIEW: "Em análise",
  CONTACTED: "Contactado",
  PROPOSAL_SENT: "Proposta enviada",
  ACCEPTED: "Aceite",
  REJECTED: "Rejeitado",
};
