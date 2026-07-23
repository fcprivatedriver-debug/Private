import type {
  ProposalStatus,
  TripStatus,
  UserStatus,
  VehicleClass,
  VehicleStatus,
} from "@/types";

export const tripStatusLabels: Record<TripStatus, string> = {
  draft: "Rascunho",
  open: "Aberto a propostas",
  awaiting_selection: "A aguardar escolha",
  confirmed: "Confirmado",
  in_progress: "Em curso",
  completed: "Concluído",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  pending: "Pendente",
  accepted: "Aceite",
  rejected: "Recusada",
  withdrawn: "Retirada",
  expired: "Expirada",
};

export const vehicleClassLabels: Record<VehicleClass, string> = {
  economy: "Económico",
  comfort: "Conforto",
  business: "Business",
  premium: "Premium",
  van: "Van",
  minibus: "Minibus",
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending_review: "Em revisão",
  rejected: "Rejeitado",
};

export const userStatusLabels: Record<UserStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  pending: "Pendente",
  suspended: "Suspenso",
};
