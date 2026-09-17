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
    <div className={`captura-page falar-page ${autoStart ? "captura-fast" : ""}`}>
      <h1 className="page-title">
        {mode === "photo" ? "Fatura" : "MEL"}
      </h1>
      <p className="page-sub falar-prompt">
        {mode === "photo"
          ? "Anexa a fatura — fotografia ou PDF."
          : "Como posso ajudar?"}
      </p>
      <InstantCapture initialMode={mode} autoStart={autoStart} compact />
    </div>
  );
}
