/** Formatação de frescura — nunca esconder idade do dado. */

export function formatUpdatedAt(date: Date, now = new Date()): string {
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Atualizado agora";
  if (mins < 60) return `Atualizado há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Atualizado há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) {
    return `Atualizado ontem às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return `Atualizado em ${pad(date.getDate())}/${pad(date.getMonth() + 1)} às ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type FreshnessMeta = {
  fetchedAt: string; // ISO
  sourceUpdatedAt: string | null;
  stale: boolean;
  label: string;
  source: string;
};

export function buildFreshness(opts: {
  fetchedAt: Date;
  sourceUpdatedAt?: Date | null;
  stale: boolean;
  source: string;
  now?: Date;
}): FreshnessMeta {
  return {
    fetchedAt: opts.fetchedAt.toISOString(),
    sourceUpdatedAt: opts.sourceUpdatedAt?.toISOString() ?? null,
    stale: opts.stale,
    label: formatUpdatedAt(opts.sourceUpdatedAt ?? opts.fetchedAt, opts.now),
    source: opts.source,
  };
}
