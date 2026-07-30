"use client";

/** Contagem de hoje + atrasadas no topo do dashboard. */
export function TodayCountBanner({
  todayCount,
  overdueCount,
}: {
  todayCount: number;
  overdueCount: number;
}) {
  const parts: string[] = [];
  parts.push(
    `${todayCount} tarefa${todayCount === 1 ? "" : "s"} hoje`,
  );
  if (overdueCount > 0) {
    parts.push(
      `${overdueCount} atrasada${overdueCount === 1 ? "" : "s"}`,
    );
  }
  return (
    <p className="today-count-banner" role="status">
      {parts.join(" · ")}
    </p>
  );
}
