import type {
  AiDriverContext,
  AiFinding,
  AiVerificationProvider,
  AiVerificationResult,
} from "./types";

const REQUIRED_DOCS = [
  "IDENTITY",
  "DRIVING_LICENSE",
  "TVDE_CERTIFICATE",
  "CRIMINAL_RECORD",
] as const;

const REQUIRED_PHOTOS = [
  "front",
  "rear",
  "left",
  "right",
  "interiorFront",
  "interiorRear",
  "trunk",
] as const;

/**
 * Heuristic AI verifier used when no external LLM key is set.
 * Checks document presence/quality signals and vehicle photo completeness.
 */
export class HeuristicAiVerificationProvider implements AiVerificationProvider {
  async analyzeDriver(ctx: AiDriverContext): Promise<AiVerificationResult> {
    const findings: AiFinding[] = [];
    let risk = 10;
    const documentScores: Record<string, number> = {};
    const photoScores: Record<string, number> = {};

    const presentTypes = new Set(ctx.documents.map((d) => d.type));
    for (const required of REQUIRED_DOCS) {
      if (!presentTypes.has(required)) {
        risk += 16;
        findings.push({
          code: "MISSING_DOC",
          severity: "critical",
          message: `Documento obrigatório em falta: ${required}`,
        });
      }
    }

    for (const doc of ctx.documents) {
      let score = 90;
      if (!doc.mimeType.startsWith("image/") && doc.mimeType !== "application/pdf") {
        score -= 35;
        risk += 10;
        findings.push({
          code: "UNSUPPORTED_MIME",
          severity: "warn",
          message: `${doc.type}: tipo de ficheiro pouco legível (${doc.mimeType})`,
        });
      }
      if (doc.sizeBytes < 8_000) {
        score -= 30;
        risk += 10;
        findings.push({
          code: "FILE_TOO_SMALL",
          severity: "warn",
          message: `${doc.type}: ficheiro demasiado pequeno — possível baixa legibilidade`,
        });
      }
      if (doc.sizeBytes > 12_000_000) {
        score -= 8;
        findings.push({
          code: "FILE_LARGE",
          severity: "info",
          message: `${doc.type}: ficheiro muito grande`,
        });
      }
      const name = doc.fileName.toLowerCase();
      if (name.includes("screenshot") || name.includes("whatsapp")) {
        score -= 18;
        risk += 8;
        findings.push({
          code: "SCREENSHOT_LIKELY",
          severity: "warn",
          message: `${doc.type}: parece um screenshot — prefira digitalização ou fotografia nítida`,
        });
      }
      if (name.includes("blur") || name.includes("dark")) {
        score -= 20;
        risk += 8;
        findings.push({
          code: "QUALITY_HINT",
          severity: "warn",
          message: `${doc.type}: indícios de má qualidade/iluminação`,
        });
      }
      documentScores[doc.type] = Math.max(0, Math.min(100, score));
    }

    if (!ctx.hasVehicle || !ctx.vehicle) {
      risk += 22;
      findings.push({
        code: "NO_VEHICLE",
        severity: "critical",
        message: "Veículo não registado",
      });
    } else {
      const plate = ctx.vehicle.plate.replace(/\s+/g, "").toUpperCase();
      if (plate.length < 5) {
        risk += 12;
        findings.push({
          code: "INVALID_PLATE",
          severity: "critical",
          message: "Matrícula inválida ou incompleta",
        });
      }
      const year = ctx.vehicle.year;
      const current = new Date().getFullYear();
      if (year < 2008 || year > current + 1) {
        risk += 8;
        findings.push({
          code: "VEHICLE_YEAR",
          severity: "warn",
          message: `Ano do veículo invulgar (${year})`,
        });
      }

      const photos = ctx.vehicle.photos || {};
      for (const key of REQUIRED_PHOTOS) {
        if (!photos[key]) {
          risk += 6;
          photoScores[key] = 0;
          findings.push({
            code: "MISSING_PHOTO",
            severity: "critical",
            message: `Fotografia do veículo em falta: ${key}`,
          });
        } else {
          let pScore = 88;
          const url = photos[key].toLowerCase();
          if (url.includes("blur") || url.includes("dark")) {
            pScore -= 20;
            risk += 4;
            findings.push({
              code: "PHOTO_QUALITY",
              severity: "warn",
              message: `Fotografia ${key}: qualidade/iluminação duvidosa`,
            });
          }
          photoScores[key] = pScore;
        }
      }
      if (photos.video) {
        findings.push({
          code: "VIDEO_PRESENT",
          severity: "info",
          message: "Vídeo opcional do veículo enviado",
        });
        risk -= 2;
      }
    }

    if (ctx.yearsOfExperience < 1) {
      risk += 4;
      findings.push({
        code: "LOW_EXPERIENCE",
        severity: "info",
        message: "Pouca experiência declarada",
      });
    }

    risk = Math.max(0, Math.min(100, Math.round(risk)));
    const confidence = Math.max(
      55,
      Math.min(96, 93 - findings.filter((f) => f.severity !== "info").length * 3),
    );

    let recommendation: AiVerificationResult["recommendation"] = "APPROVE";
    if (risk >= 40 || findings.some((f) => f.code === "MISSING_DOC" || f.code === "MISSING_PHOTO")) {
      recommendation = "REQUEST_INFO";
    }
    if (risk >= 70) recommendation = "ESCALATE";
    if (risk >= 88) recommendation = "REJECT";

    const summary =
      recommendation === "APPROVE"
        ? `IA recomenda APROVADO para ${ctx.name} (risco ${risk}/100).`
        : recommendation === "REQUEST_INFO"
          ? `IA recomenda PENDENTE — pedir novos documentos/fotos a ${ctx.name} (risco ${risk}/100).`
          : recommendation === "ESCALATE"
            ? `IA recomenda revisão manual para ${ctx.name} (risco ${risk}/100).`
            : `IA recomenda REJEITADO para ${ctx.name} (risco ${risk}/100).`;

    return {
      provider: "heuristic",
      riskScore: risk,
      confidence,
      recommendation,
      summary,
      findings,
      documentScores,
      photoScores,
    };
  }
}
