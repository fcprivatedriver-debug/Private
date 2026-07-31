import { ZodError } from "zod";

export type ActionFailure = {
  ok: false;
  error: string;
  code: string;
};

function isDomainError(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string" &&
    error.constructor?.name === "DomainError"
  );
}

function prismaCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function errorName(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    return String((error as { name?: unknown }).name || "");
  }
  return error instanceof Error ? error.constructor.name : "";
}

/** Map unknown errors to specific, user-facing Portuguese messages. */
export function toActionFailure(error: unknown): ActionFailure {
  if (isDomainError(error)) {
    return { ok: false, error: error.message, code: error.code };
  }

  if (error instanceof ZodError) {
    const first = error.issues[0];
    const message = first?.message?.trim() || "Dados inválidos. Verifique os campos.";
    return { ok: false, error: message, code: "VALIDATION" };
  }

  const code = prismaCode(error);
  const name = errorName(error);

  if (code === "P2002") {
    return { ok: false, error: "Este email já está registado.", code: "EMAIL_TAKEN" };
  }
  if (code === "P2003") {
    return { ok: false, error: "Não foi possível criar a conta. Consulte os logs do servidor.", code: "FK" };
  }
  if (code?.startsWith("P") && name.includes("Prisma")) {
    console.error("[prisma known]", code, error);
    return {
      ok: false,
      error: "Não foi possível criar a conta. Consulte os logs do servidor.",
      code,
    };
  }

  if (name.includes("PrismaClientInitializationError") || name.includes("PrismaClientRustPanicError")) {
    console.error("[prisma init]", error);
    return { ok: false, error: "Não foi possível ligar ao servidor. Tente novamente.", code: "DB_INIT" };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("can't reach database") ||
      msg.includes("connection") ||
      msg.includes("econnrefused") ||
      msg.includes("timeout") ||
      msg.includes("fetch failed") ||
      msg.includes("database_url")
    ) {
      console.error("[db connectivity]", error);
      return { ok: false, error: "Não foi possível ligar ao servidor. Tente novamente.", code: "DB_CONNECTION" };
    }
    console.error("[action error]", error);
    return {
      ok: false,
      error: "Não foi possível criar a conta. Consulte os logs do servidor.",
      code: "INTERNAL",
    };
  }

  console.error("[action unknown]", error);
  return {
    ok: false,
    error: "Não foi possível criar a conta. Consulte os logs do servidor.",
    code: "INTERNAL",
  };
}
