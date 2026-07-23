import { requireRole } from "@/lib/session";
import { listVerificationQueue } from "@/domain/onboarding";
import { VerificationQueue } from "@/components/admin/VerificationQueue";
import { Link } from "@/i18n/navigation";

export default async function AdminVerificationsPage() {
  await requireRole("ADMIN");
  const queue = await listVerificationQueue();

  return (
    <section className="section fade-up">
      <div className="container">
        <p className="muted">
          <Link href="/admin">← Admin</Link>
        </p>
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          AI verification queue
        </h1>
        <p className="lead">
          Review driver applications with Movio AI risk scores, document signals and audit-ready
          decisions.
        </p>
        <VerificationQueue
          items={queue.map((q) => ({
            id: q.id,
            status: q.status,
            onboardingStatus: q.onboardingStatus,
            completenessScore: q.completenessScore,
            aiRiskScore: q.aiRiskScore,
            aiConfidence: q.aiConfidence,
            aiSummary: q.aiSummary,
            submittedAt: q.submittedAt,
            user: q.user,
            vehicles: q.vehicles.map((v) => ({
              make: v.make,
              model: v.model,
              plate: v.plate,
            })),
            verificationDocs: q.verificationDocs.map((d) => ({
              id: d.id,
              type: d.type,
              status: d.status,
              fileName: d.fileName,
              url: d.url,
              aiScore: d.aiScore,
            })),
            verificationReviews: q.verificationReviews.map((r) => ({
              id: r.id,
              source: r.source,
              decision: r.decision,
              recommendation: r.recommendation,
              riskScore: r.riskScore,
            })),
          }))}
        />
      </div>
    </section>
  );
}
