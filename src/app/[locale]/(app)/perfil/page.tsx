import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { ProfileForm } from "@/components/nina/ProfileForm";

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });

  return (
    <div>
      <h1 className="page-title">O teu perfil</h1>
      <p className="page-sub">
        Nome, preferências e autenticação própria — mesmo partilhando a Conta Familiar.
      </p>
      <Panel title="Dados pessoais">
        <ProfileForm
          name={user.name}
          email={user.email}
          theme={user.theme}
          biometricsEnabled={user.biometricsEnabled}
          hasPin={Boolean(user.pinHash)}
          ninaReplyStyle={user.ninaReplyStyle}
          ninaHumor={user.ninaHumor}
        />
      </Panel>
      <Panel title="Na Conta Familiar">
        <p style={{ marginTop: 0 }}>
          <strong>{membership.displayName}</strong> · {membership.role} · {membership.family.name}
        </p>
        <p className="muted small">
          Fotografia e cor do perfil: {membership.photoUrl ? "definida" : "por definir"} · cor{" "}
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: 999,
              background: membership.color,
              verticalAlign: "middle",
            }}
          />
        </p>
      </Panel>
    </div>
  );
}
