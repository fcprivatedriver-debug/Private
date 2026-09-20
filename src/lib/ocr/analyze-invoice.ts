/**
 * Análise estruturada de faturas via OpenAI Vision (gpt-4o-mini).
 * NUNCA inventa valores — campos desconhecidos = null / confiança baixa.
 */
import { z } from "zod";
import { getOpenAI } from "@/lib/mel/openai";
import { isOpenAiConfigured, resolveMelModel } from "@/lib/mel/config";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/categories";
import { estimateCostMicros, logMelUsage } from "@/lib/mel/usage";

export const invoiceExtractionSchema = z.object({
  supplier: z.string().nullable(),
  total: z.number().nullable(),
  currency: z.string().nullable(),
  invoiceDate: z.string().nullable(), // YYYY-MM-DD
  dueDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  category: z.string().nullable(), // slug ou nome das categorias conhecidas
  description: z.string().nullable(),
  vat: z.number().nullable().optional(),
  confidence: z.object({
    supplier: z.number().min(0).max(1),
    total: z.number().min(0).max(1),
    invoiceDate: z.number().min(0).max(1),
    dueDate: z.number().min(0).max(1),
    category: z.number().min(0).max(1),
  }),
});

export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;

export type AnalyzeInvoiceResult =
  | {
      ok: true;
      available: true;
      extraction: InvoiceExtraction;
      model: string;
      usage?: { inputTokens: number; outputTokens: number; costMicros: number };
    }
  | {
      ok: false;
      available: false;
      error: string;
      code: "NOT_CONFIGURED" | "UNSUPPORTED" | "PARSE_FAILED" | "API_ERROR" | "EMPTY";
    };

const CATEGORY_SLUGS = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.slug).join(", ");
const CATEGORY_NAMES = DEFAULT_EXPENSE_CATEGORIES.map((c) => `${c.name} (${c.slug})`).join("; ");

const SYSTEM_PROMPT = `És um extrator de dados de faturas portuguesas para a app addYknow.
Devolve APENAS JSON válido (sem markdown) com o schema pedido.

REGRAS OBRIGATÓRIAS:
1. NUNCA inventes dados. Se não estiver legível ou não existir → null e confiança baixa (≤0.3).
2. "total" = valor FINAL A PAGAR (total da fatura). NÃO uses subtotal, IVA isolado, saldo anterior, consumos, descontos ou parcelas como total.
3. Datas em YYYY-MM-DD. dueDate = data limite de pagamento / "pagar até" se existir; senão null.
4. currency: normalmente "EUR".
5. category: escolhe o slug mais adequado desta lista: ${CATEGORY_SLUGS}
   Nomes: ${CATEGORY_NAMES}
   Exemplos: EDP/Endesa/Galp Energia → luz; fatura com eletricidade+gás → eletricidade-gas; Continente/Pingo Doce → supermercado; combustível → combustivel; NOS/MEO/Vodafone → internet ou telemoveis; veterinário → animais.
6. confidence: 0–1 por campo (quão certo estás de que o valor está correcto e legível).
7. supplier: nome do fornecedor/estabelecimento como aparece na fatura.
8. description: curta (ex.: "EDP" ou "Continente").

Schema JSON:
{
  "supplier": string|null,
  "total": number|null,
  "currency": string|null,
  "invoiceDate": string|null,
  "dueDate": string|null,
  "invoiceNumber": string|null,
  "category": string|null,
  "description": string|null,
  "vat": number|null,
  "confidence": {
    "supplier": number,
    "total": number,
    "invoiceDate": number,
    "dueDate": number,
    "category": number
  }
}`;

function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return null;
}

function normalizeCategory(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  const bySlug = DEFAULT_EXPENSE_CATEGORIES.find((c) => c.slug === t);
  if (bySlug) return bySlug.slug;
  const byName = DEFAULT_EXPENSE_CATEGORIES.find(
    (c) => c.name.toLowerCase() === t || c.name.toLowerCase().includes(t) || t.includes(c.slug),
  );
  if (byName) return byName.slug;
  // aliases
  if (/(eletricidade\/?\s*gas|luz\s*e\s*gas|eletricidade\s*e\s*gas)/.test(t)) return "eletricidade-gas";
  if (/(eletricidade|^luz$|edp|endesa)/.test(t)) return "luz";
  if (/(supermercado|continente|pingo|lidl|auchan|mercador)/.test(t)) return "supermercado";
  if (/(combust|galp|repsol|prio|bp\b)/.test(t)) return "combustivel";
  if (/(telecom|nos|meo|vodafone|internet)/.test(t)) return "internet";
  if (/(veterin|pet\b|animais)/.test(t)) return "animais";
  return null;
}

function mimeToDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

/**
 * Analisa bytes de imagem/PDF. Requer OPENAI_API_KEY.
 */
export async function analyzeInvoiceDocument(input: {
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
  userId?: string;
  familyId?: string;
}): Promise<AnalyzeInvoiceResult> {
  if (!input.bytes?.length) {
    return { ok: false, available: false, error: "Ficheiro vazio.", code: "EMPTY" };
  }
  if (!isOpenAiConfigured()) {
    return {
      ok: false,
      available: false,
      error:
        "A análise automática não está configurada neste ambiente. A fatura ficou guardada — confirma os dados para criar a despesa.",
      code: "NOT_CONFIGURED",
    };
  }

  const openai = getOpenAI();
  if (!openai) {
    return {
      ok: false,
      available: false,
      error: "OpenAI indisponível.",
      code: "NOT_CONFIGURED",
    };
  }

  const mime = (input.mimeType || "").toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(input.fileName || "");
  if (!isImage && !isPdf) {
    return {
      ok: false,
      available: false,
      error: "Formato não suportado para análise. Usa JPEG, PNG, WEBP ou PDF.",
      code: "UNSUPPORTED",
    };
  }

  const model = resolveMelModel();
  const b64 = input.bytes.toString("base64");

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
    | { type: "file"; file: { filename: string; file_data: string } };

  const userContent: ContentPart[] = [
    {
      type: "text",
      text: `Analisa esta fatura${input.fileName ? ` (${input.fileName})` : ""} e devolve o JSON do schema.`,
    },
  ];

  if (isImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: mimeToDataUrl(mime || "image/jpeg", b64) },
    });
  } else if (isPdf) {
    userContent.push({
      type: "file",
      file: {
        filename: input.fileName || "fatura.pdf",
        file_data: mimeToDataUrl("application/pdf", b64),
      },
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // Cast: SDK tipagens podem atrasar o content part `file`
        { role: "user", content: userContent as never },
      ],
    });

    const rawText = completion.choices[0]?.message?.content?.trim() || "";
    if (!rawText) {
      return {
        ok: false,
        available: false,
        error: "A análise não devolveu dados. Tenta outra fotografia mais nítida.",
        code: "PARSE_FAILED",
      };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return {
        ok: false,
        available: false,
        error: "Resposta de análise inválida. Tenta novamente.",
        code: "PARSE_FAILED",
      };
    }

    const validated = invoiceExtractionSchema.safeParse(parsedJson);
    if (!validated.success) {
      return {
        ok: false,
        available: false,
        error: "Dados extraídos incompletos ou inválidos. Confirma manualmente os campos.",
        code: "PARSE_FAILED",
      };
    }

    const data = validated.data;
    // Pós-processamento: normalizar datas/categoria; zerar campos inventados com conf baixa
    const extraction: InvoiceExtraction = {
      supplier: data.supplier?.trim() || null,
      total:
        data.total != null && Number.isFinite(data.total) && data.total > 0
          ? Math.round(data.total * 100) / 100
          : null,
      currency: data.currency?.trim()?.toUpperCase() || (data.total != null ? "EUR" : null),
      invoiceDate: normalizeDate(data.invoiceDate),
      dueDate: normalizeDate(data.dueDate),
      invoiceNumber: data.invoiceNumber?.trim() || null,
      category: normalizeCategory(data.category),
      description: data.description?.trim() || data.supplier?.trim() || null,
      vat:
        data.vat != null && Number.isFinite(data.vat) && data.vat >= 0
          ? Math.round(data.vat * 100) / 100
          : null,
      confidence: {
        supplier: clamp01(data.confidence.supplier),
        total: clamp01(data.confidence.total),
        invoiceDate: clamp01(data.confidence.invoiceDate),
        dueDate: clamp01(data.confidence.dueDate),
        category: clamp01(data.confidence.category),
      },
    };

    // Se confiança muito baixa, forçar null (nunca inventar)
    if (extraction.confidence.total < 0.45) extraction.total = null;
    if (extraction.confidence.supplier < 0.4) extraction.supplier = null;
    if (extraction.confidence.invoiceDate < 0.45) extraction.invoiceDate = null;
    if (extraction.confidence.dueDate < 0.45) extraction.dueDate = null;
    if (extraction.confidence.category < 0.4) extraction.category = null;

    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    const costMicros = estimateCostMicros(model, inputTokens, outputTokens);

    if (input.userId) {
      await logMelUsage({
        userId: input.userId,
        familyId: input.familyId,
        model,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        estimatedCostMicros: costMicros,
        success: true,
      });
    }

    return {
      ok: true,
      available: true,
      extraction,
      model,
      usage: { inputTokens, outputTokens, costMicros },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ocr] analyzeInvoiceDocument failed:", message);
    // PDF pode falhar no image_url — mensagem clara
    if (isPdf && /invalid|unsupported|pdf/i.test(message)) {
      return {
        ok: false,
        available: false,
        error:
          "Não consegui ler este PDF automaticamente. Tenta exportar a primeira página como imagem (JPEG/PNG) ou fotografa o documento.",
        code: "UNSUPPORTED",
      };
    }
    return {
      ok: false,
      available: false,
      error: "Falha na análise automática. Tenta novamente ou confirma os dados manualmente.",
      code: "API_ERROR",
    };
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Campos essenciais com confiança suficiente para um clique «Confirmar e guardar». */
export function extractionReadyToConfirm(e: InvoiceExtraction): boolean {
  return (
    e.total != null &&
    e.total > 0 &&
    e.confidence.total >= 0.75 &&
    Boolean(e.invoiceDate) &&
    e.confidence.invoiceDate >= 0.75 &&
    Boolean(e.category) &&
    e.confidence.category >= 0.7 &&
    Boolean(e.supplier || e.description)
  );
}
