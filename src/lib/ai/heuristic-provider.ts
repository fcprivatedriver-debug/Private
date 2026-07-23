import type {
  AiDriverContext,
  AiFinding,
  AiVerificationProvider,
  AiVerificationResult,
} from "./types";

const REQUIRED_DOCS = ["IDENTITY", "DRIVING_LICENSE", "INSURANCE", "VEHICLE_REGISTRATION"] as const;

/**
 * Premium-grade heuristic AI verifier used when no external LLM key is set.
 * Produces explainable risk scores, findings, and recommendations suitable
 * for admin review queues. Swap for OpenAI provider when configured.
 */
export class HeuristicAiVerificationProvider implements AiVerificationProvider {
  async analyzeDriver(ctx: AiDriverContext): Promise<AiVerificationResult> {
    const findings: AiFinding[] = [];
    let risk = 12;
    const documentScores: Record<string, number> = {};

    const presentTypes = new Set(ctx.documents.map((d) => d.type));
    for (const required of REQUIRED_DOCS) {
      if (!presentTypes.has(required)) {
        risk += 18;
        findings.push({
          code: "MISSING_DOC",
          severity: "critical",
          message: `Missing required document: ${required}`,
        });
      }
    }

    for (const doc of ctx.documents) {
      let score = 88;
      if (!doc.mimeType.startsWith("image/") && doc.mimeType !== "application/pdf") {
        score -= 35;
        risk += 10;
        findings.push({
          code: "UNSUPPORTED_MIME",
          severity: "warn",
          message: `${doc.type} has unusual mime type (${doc.mimeType})`,
        });
      }
      if (doc.sizeBytes < 8_000) {
        score -= 25;
        risk += 8;
        findings.push({
          code: "FILE_TOO_SMALL",
          severity: "warn",
          message: `${doc.type} file may be too small for reliable OCR (${doc.sizeBytes} bytes)`,
        });
      }
      if (doc.sizeBytes > 12_000_000) {
        score -= 10;
        findings.push({
          code: "FILE_LARGE",
          severity: "info",
          message: `${doc.type} is unusually large`,
        });
      }
      const name = doc.fileName.toLowerCase();
      if (name.includes("screenshot") || name.includes("whatsapp")) {
        score -= 15;
        risk += 6;
        findings.push({
          code: "SCREENSHOT_LIKELY",
          severity: "warn",
          message: `${doc.type} filename suggests a screenshot rather than an original scan`,
        });
      }
      documentScores[doc.type] = Math.max(0, Math.min(100, score));
    }

    if (!ctx.hasPhoto) {
      risk += 10;
      findings.push({
        code: "NO_PROFILE_PHOTO",
        severity: "warn",
        message: "Profile photo missing — face match against ID cannot run",
      });
    }

    if (!ctx.bio || ctx.bio.trim().length < 40) {
      risk += 6;
      findings.push({
        code: "THIN_BIO",
        severity: "info",
        message: "Biography is short; authenticity signal is weak",
      });
    }

    if (ctx.yearsOfExperience < 1) {
      risk += 8;
      findings.push({
        code: "LOW_EXPERIENCE",
        severity: "warn",
        message: "Less than 1 year of declared experience",
      });
    } else if (ctx.yearsOfExperience >= 5) {
      risk -= 4;
      findings.push({
        code: "EXPERIENCED",
        severity: "info",
        message: "Declared experience supports approval",
      });
    }

    if (!ctx.hasVehicle || !ctx.vehicle) {
      risk += 20;
      findings.push({
        code: "NO_VEHICLE",
        severity: "critical",
        message: "No vehicle registered",
      });
    } else {
      const plate = ctx.vehicle.plate.replace(/\s+/g, "").toUpperCase();
      if (plate.length < 5) {
        risk += 12;
        findings.push({
          code: "INVALID_PLATE",
          severity: "critical",
          message: "Vehicle plate looks invalid",
        });
      }
      const year = ctx.vehicle.year;
      const current = new Date().getFullYear();
      if (year < 2005 || year > current + 1) {
        risk += 10;
        findings.push({
          code: "VEHICLE_YEAR",
          severity: "warn",
          message: `Unusual vehicle year (${year})`,
        });
      }
    }

    if (ctx.languagesSpoken.length === 0) {
      risk += 4;
      findings.push({
        code: "NO_LANGUAGES",
        severity: "info",
        message: "No spoken languages declared",
      });
    }

    risk = Math.max(0, Math.min(100, Math.round(risk)));
    const confidence = Math.max(
      55,
      Math.min(96, 92 - findings.filter((f) => f.severity !== "info").length * 4),
    );

    let recommendation: AiVerificationResult["recommendation"] = "APPROVE";
    if (risk >= 55 || findings.some((f) => f.code === "MISSING_DOC" || f.code === "NO_VEHICLE")) {
      recommendation = "REQUEST_INFO";
    }
    if (risk >= 75) recommendation = "ESCALATE";
    if (risk >= 88) recommendation = "REJECT";

    const summary =
      recommendation === "APPROVE"
        ? `AI recommends approval for ${ctx.name} (risk ${risk}/100).`
        : recommendation === "REQUEST_INFO"
          ? `AI recommends requesting more information from ${ctx.name} (risk ${risk}/100).`
          : recommendation === "ESCALATE"
            ? `AI recommends human escalation for ${ctx.name} (risk ${risk}/100).`
            : `AI recommends rejection for ${ctx.name} (risk ${risk}/100).`;

    return {
      provider: "heuristic",
      riskScore: risk,
      confidence,
      recommendation,
      summary,
      findings,
      documentScores,
    };
  }
}
