import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { InstantCapture } from "@/components/nina/InstantCapture";
import { listExpenseCategories } from "@/lib/categories-ensure";

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
  // auto=1 só para voz — Fatura nunca inicia a câmara sozinha
  const autoStart =
    mode === "voice" && (sp.auto === "1" || sp.auto === "true");

  const categories =
    mode === "photo"
      ? await listExpenseCategories(membership.familyId)
      : [];

  return (
    <div className={`captura-page falar-page ${autoStart ? "captura-fast" : ""}`}>
      <h1 className="page-title">
        {mode === "photo" ? "Fatura" : "MEL"}
      </h1>
      <p className="page-sub falar-prompt">
        {mode === "photo"
          ? "Fotografa ou anexa — a MEL analisa e prepara a despesa."
          : "Como posso ajudar?"}
      </p>
      <InstantCapture
        initialMode={mode}
        autoStart={autoStart}
        compact
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      />
    </div>
  );
}
