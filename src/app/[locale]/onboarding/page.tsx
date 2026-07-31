import { requireDriverAccess } from "@/lib/session";
import { getDriverOnboarding } from "@/domain/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Link } from "@/i18n/navigation";
import { listVehicleClasses } from "@/domain/vehicle-class";

export default async function OnboardingPage() {
  const session = await requireDriverAccess();
  const profile = await getDriverOnboarding(session.user.id);
  const classes = await listVehicleClasses({ activeOnly: true, locale: "pt" });

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="muted">
          <Link href="/painel">← Painel</Link>
        </p>
        <h1 className="page-title">Onboarding de motorista</h1>
        <p className="page-lead">
          Complete os dados, documentos e fotografias. A IA analisa tudo; a equipa pode aprovar
          manualmente enquanto a rede cresce.
        </p>
        <OnboardingWizard
          vehicleClasses={classes.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
          }))}
          profile={{
            id: profile.id,
            bio: profile.bio,
            photoUrl: profile.photoUrl,
            languagesSpoken: profile.languagesSpoken,
            yearsOfExperience: profile.yearsOfExperience,
            completenessScore: profile.completenessScore,
            onboardingStatus: profile.onboardingStatus,
            onboardingStep: profile.onboardingStep,
            status: profile.status,
            aiRiskScore: profile.aiRiskScore,
            aiSummary: profile.aiSummary,
            rejectionReason: profile.rejectionReason,
            infoRequestMessage: profile.infoRequestMessage,
            user: profile.user,
            vehicles: profile.vehicles.map((v) => ({
              id: v.id,
              make: v.make,
              model: v.model,
              year: v.year,
              color: v.color,
              plate: v.plate,
              seats: v.seats,
              luggageCapacity: v.luggageCapacity,
              vehicleClassId: v.vehicleClassId,
              photoUrls: v.photoUrls,
            })),
            verificationDocs: profile.verificationDocs.map((d) => ({
              id: d.id,
              type: d.type,
              status: d.status,
              fileName: d.fileName,
              url: d.url,
              aiScore: d.aiScore,
            })),
          }}
        />
      </div>
    </section>
  );
}
