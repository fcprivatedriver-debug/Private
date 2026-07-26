import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { InstantCapture } from "@/components/nina/InstantCapture";

type Mode = "voice" | "photo" | "write";

export default async function CapturaPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string; auto?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const sp = (await searchParams) || {};
  const mode: Mode =
    sp.mode === "photo" || sp.mode === "write" || sp.mode === "voice" ? sp.mode : "voice";
  const autoStart = sp.auto === "1" || sp.auto === "true";

  return (
    <div className={`captura-page ${autoStart ? "captura-fast" : ""}`}>
      <p className="nina-kicker">{autoStart ? "Captura rápida" : "Funcionalidade principal"}</p>
      <h1 className="page-title">
        {mode === "photo"
          ? "Fotografar fatura"
          : autoStart
            ? "Falar com a Nina"
            : "Captura Instantânea"}
      </h1>
      <p className="page-sub">
        {autoStart && mode === "voice"
          ? "Diz o valor e o sítio. A Nina interpreta a intenção, categoriza e atualiza tudo — tu continua a viver."
          : "Fala, escreve ou fotografa a fatura. A Nina interpreta e executa — sem menus, sem formulários, sem burocracia."}
      </p>
      <InstantCapture initialMode={mode} autoStart={autoStart} />
    </div>
  );
}
