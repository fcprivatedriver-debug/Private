import { Link } from "@/i18n/navigation";

export function DriverHubTabs({ active }: { active: "pedidos" | "propostas" }) {
  return (
    <div className="driver-hub-tabs" role="tablist" aria-label="Área do motorista">
      <Link
        href="/pedidos-abertos"
        role="tab"
        aria-selected={active === "pedidos"}
        className={active === "pedidos" ? "driver-hub-tab is-active" : "driver-hub-tab"}
      >
        Pedidos
      </Link>
      <Link
        href="/propostas"
        role="tab"
        aria-selected={active === "propostas"}
        className={active === "propostas" ? "driver-hub-tab is-active" : "driver-hub-tab"}
      >
        As minhas propostas
      </Link>
    </div>
  );
}
