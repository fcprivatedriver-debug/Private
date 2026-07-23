import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import {
  getDriverOnboarding,
  submitOnboarding,
  updateDriverProfileStep,
  uploadDriverDocument,
  listVerificationQueue,
  adminDecideVerification,
  runAiVerification,
} from "@/domain/onboarding";
import { DomainError } from "@/domain/marketplace";
import type { DriverDocumentType } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  if (session.user.role === "ADMIN") {
    const queue = await listVerificationQueue();
    return Response.json({ queue });
  }

  if (session.user.role !== "DRIVER") {
    return apiError("FORBIDDEN", "Sem permissão", 403);
  }

  try {
    const profile = await getDriverOnboarding(session.user.id);
    return Response.json({ profile });
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    throw error;
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      if (session.user.role !== "DRIVER") return apiError("FORBIDDEN", "Sem permissão", 403);
      const form = await request.formData();
      const action = String(form.get("action") || "upload");

      if (action === "upload") {
        const file = form.get("file");
        const type = String(form.get("type") || "") as DriverDocumentType;
        if (!(file instanceof File)) return apiError("VALIDATION", "Ficheiro em falta");
        const bytes = Buffer.from(await file.arrayBuffer());
        const doc = await uploadDriverDocument({
          userId: session.user.id,
          type,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          bytes,
        });
        return Response.json({ document: doc }, { status: 201 });
      }

      if (action === "profile") {
        const languages = String(form.get("languagesSpoken") || "pt")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const profile = await updateDriverProfileStep(session.user.id, {
          bio: String(form.get("bio") || ""),
          yearsOfExperience: Number(form.get("yearsOfExperience") || 0),
          languagesSpoken: languages,
          photoUrl: String(form.get("photoUrl") || "") || null,
          step: "profile",
        });
        return Response.json({ profile });
      }

      if (action === "submit") {
        const result = await submitOnboarding(session.user.id);
        return Response.json(result);
      }

      return apiError("BAD_REQUEST", "Ação desconhecida");
    }

    const body = await request.json();

    if (session.user.role === "ADMIN") {
      if (body.action === "decide") {
        const result = await adminDecideVerification({
          driverProfileId: body.driverProfileId,
          adminUserId: session.user.id,
          decision: body.decision,
          notes: body.notes,
        });
        return Response.json(result);
      }
      if (body.action === "rerun-ai") {
        const ai = await runAiVerification(body.driverProfileId, session.user.id);
        return Response.json({ ai });
      }
      return apiError("BAD_REQUEST", "Ação admin desconhecida");
    }

    if (session.user.role === "DRIVER" && body.action === "submit") {
      const result = await submitOnboarding(session.user.id);
      return Response.json(result);
    }

    return apiError("BAD_REQUEST", "Ação desconhecida");
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message, 400);
    throw error;
  }
}
