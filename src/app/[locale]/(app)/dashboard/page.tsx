import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import {
  DashExpenseIcon,
  DashIncomeIcon,
  DashMobilityIcon,
  DashScheduleIcon,
  DashShoppingIcon,
} from "@/components/dashboard/DashActionIcons";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/pt/login");
  }

  const membership = await getActiveFamilyForUser(session.user.id);

  if (!membership) {
    redirect("/pt/registo");
  }

  const firstName = membership.displayName?.split(" ")[0] || "";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        padding: "28px 20px 48px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <header style={{ marginBottom: "32px" }}>
          <p
            style={{
              margin: "0 0 6px",
              color: "#667085",
              fontSize: "15px",
            }}
          >
            addYknow
          </p>

          <h1
            style={{
              margin: 0,
              color: "#123f63",
              fontSize: "30px",
              lineHeight: 1.15,
            }}
          >
            Olá{firstName ? `, ${firstName}` : ""}
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#667085",
              fontSize: "17px",
            }}
          >
            O que queres fazer?
          </p>
        </header>

        <div className="dash-actions">
          <Link href="/pt/despesas" className="dash-action">
            <DashExpenseIcon />
            <span>Despesa</span>
          </Link>

          <Link href="/pt/receitas" className="dash-action">
            <DashIncomeIcon />
            <span>Receita</span>
          </Link>

          <Link href="/pt/calendario" className="dash-action">
            <DashScheduleIcon />
            <span>Agendar</span>
          </Link>

          <Link href="/pt/mobilidade" className="dash-action">
            <DashMobilityIcon />
            <span>Mobilidade</span>
          </Link>

          <Link href="/pt/lista" className="dash-action">
            <DashShoppingIcon />
            <span>Compras</span>
          </Link>

          <Link
            href="/pt/captura?mode=voice&auto=1"
            className="dash-action dash-action--text"
          >
            Fala com a Mel
          </Link>
        </div>

        <div style={{ marginTop: "26px", textAlign: "center" }}>
          <Link
            href="/pt/guia"
            style={{
              color: "#123f63",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ver tudo →
          </Link>
        </div>
      </div>
    </main>
  );
}
