import type { ProposalStatus, TripStatus, VehicleStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  proposalStatusLabels,
  tripStatusLabels,
  vehicleStatusLabels,
} from "@/lib/constants";

type StatusTone = "default" | "accent" | "success" | "warning" | "danger" | "muted";

const tripTone: Record<TripStatus, StatusTone> = {
  draft: "muted",
  open: "accent",
  awaiting_selection: "warning",
  confirmed: "success",
  in_progress: "accent",
  completed: "success",
  cancelled: "danger",
  expired: "muted",
};

const proposalTone: Record<ProposalStatus, StatusTone> = {
  pending: "warning",
  accepted: "success",
  rejected: "danger",
  withdrawn: "muted",
  expired: "muted",
};

const vehicleTone: Record<VehicleStatus, StatusTone> = {
  active: "success",
  inactive: "muted",
  pending_review: "warning",
  rejected: "danger",
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return <Badge variant={tripTone[status]}>{tripStatusLabels[status]}</Badge>;
}

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <Badge variant={proposalTone[status]}>{proposalStatusLabels[status]}</Badge>
  );
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  return (
    <Badge variant={vehicleTone[status]}>{vehicleStatusLabels[status]}</Badge>
  );
}
