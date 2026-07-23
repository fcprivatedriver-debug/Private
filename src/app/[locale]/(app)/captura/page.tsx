import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { InstantCapture } from "@/components/nina/InstantCapture";

export default async function CapturaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div className="captura-page">
      <p className="nina-kicker">Funcionalidade principal</p>
      <h1 className="page-title">Captura Instantânea</h1>
      <p className="page-sub">
        Regista uma despesa ou receita em segundos — fala, escreve ou fotografa. Sem menus. Sem
        formulários.
      </p>
      <InstantCapture />
    </div>
  );
}
