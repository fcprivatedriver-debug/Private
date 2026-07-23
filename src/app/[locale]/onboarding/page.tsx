import { requireRole } from "@/lib/session";
import { getDriverOnboarding } from "@/domain/onboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { Link } from "@/i18n/navigation";

export default async function OnboardingPage() {
  const session = await requireRole("DRIVER");
  const profile = await getDriverOnboarding(session.user.id);

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 820 }}>
        <p className="muted">
          <Link href="/painel">← Dashboard</Link>
        </p>
        <h1 className="page-title">
          Driver onboarding
        </h1>
        <p className="page-lead">
          Premium verification powered by Hegos AI — complete your profile, vehicle and documents.
        </p>
        <OnboardingWizard
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
            vehicles: profile.vehicles.map((v) => ({
              id: v.id,
              make: v.make,
              model: v.model,
              plate: v.plate,
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
