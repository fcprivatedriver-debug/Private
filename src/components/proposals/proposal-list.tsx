"use client";

import { ProposalStatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { ProposalWithDriver } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface ProposalListProps {
  proposals: ProposalWithDriver[];
  selectable?: boolean;
  onAccept?: (proposalId: string) => void;
}

export function ProposalList({
  proposals,
  selectable = false,
  onAccept,
}: ProposalListProps) {
  if (proposals.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {proposals.map((proposal) => (
        <li
          key={proposal.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{proposal.driverName}</p>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              <p className="text-sm text-[var(--muted)]">
                {proposal.vehicleLabel} · ★{" "}
                {proposal.driverRatingAverage.toFixed(1)} (
                {proposal.driverRatingCount})
              </p>
              {proposal.message ? (
                <p className="pt-2 text-sm text-[var(--foreground)]">
                  {proposal.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <p className="font-[family-name:var(--font-display)] text-2xl">
                {formatCurrency(proposal.priceCents, proposal.currency)}
              </p>
              {selectable && proposal.status === "pending" ? (
                <Button
                  size="sm"
                  onClick={() => onAccept?.(proposal.id)}
                  type="button"
                >
                  Aceitar proposta
                </Button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
