import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PersonalizeNinaForm } from "@/components/nina/PersonalizeNinaForm";

export default async function PersonalizarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  return (
    <div className="page-stack">
      <header>
        <h1 className="page-title">Personalizar a Nina</h1>
        <p className="page-sub">
          Voz, avatar, tema e estilo — a Nina adapta-se a ti. Sem complicar.
        </p>
      </header>
      <PersonalizeNinaForm
        theme={user.theme}
        ninaTone={user.ninaTone}
        ninaAvatar={user.ninaAvatar}
        ninaVoice={user.ninaVoice}
      />
      <p className="muted small">
        Perfil e privacidade: <Link href="/pt/perfil">Perfil</Link> ·{" "}
        <Link href="/pt/privacidade-dados">Eliminar conta</Link>
      </p>
    </div>
  );
}
