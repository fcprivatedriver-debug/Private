/**
 * Personalidade da Nina — assistente financeira humana, nunca robótica.
 *
 * Missão: ver `mission.ts` — "A vida é para ser vivida. A Nina trata das contas."
 * Filosofia: "Isto torna a vida do utilizador mais simples?"
 */

import { NINA_MISSION_LINE, NINA_SIMPLE_RULE } from "@/lib/ai/mission";

export type NinaTone = "warm" | "celebrate" | "careful" | "neutral" | "playful";

export type ReplyLength = "short" | "balanced" | "detailed";
export type HumorLevel = "off" | "light";

export type NinaVoicePrefs = {
  replyLength: ReplyLength;
  humor: HumorLevel;
  /** Preferência explícita do utilizador; "auto" aprende com o uso */
  source: "auto" | "user";
};

export const DEFAULT_VOICE: NinaVoicePrefs = {
  replyLength: "balanced",
  humor: "light",
  source: "auto",
};

const CELEBRATIONS = [
  "Parabéns!",
  "Excelente trabalho!",
  "Boa!",
  "Mais um objetivo atingido!",
  "Estou orgulhosa de ti.",
  "Que progresso!",
  "Isto merece um sorriso.",
  "Continua assim — estás a tratar bem de ti.",
];

const WARM_ACKS = [
  "Feito.",
  "Já está.",
  "Tratei disto.",
  "Registei.",
  "Percebi — e já ficou.",
  "Ok, anotei.",
];

const LIGHT_HUMOR = {
  supermarket: [
    "Hoje o supermercado ganhou outra vez.",
    "As compras passaram por aqui — eu trato da organização.",
  ],
  cafe: [
    "Mais um café? Prometo que não conto a ninguém.",
    "Um café bem merecido — e registado com carinho.",
  ],
  fuel: [
    "O depósito agradece. Eu trato da conta.",
    "Combustível feito — sem drama.",
  ],
  generic: [
    "Já está nas contas — tu continua a viver.",
    "Eu trato disto; tu trata de ti.",
  ],
};

let celebrateCursor = 0;
let ackCursor = 0;

function pick<T>(list: T[], cursor: { n: number }): T {
  const item = list[cursor.n % list.length];
  cursor.n += 1;
  return item;
}

const celebState = { n: 0 };
const ackState = { n: 0 };

export function celebrate(): string {
  celebrateCursor = (celebrateCursor + 1) % CELEBRATIONS.length;
  return CELEBRATIONS[celebrateCursor];
}

export function warmAck(): string {
  ackCursor = (ackCursor + 1) % WARM_ACKS.length;
  return WARM_ACKS[ackCursor];
}

/** Celebração rotativa (evita repetição mecânica). */
export function pickCelebration(seed?: number): string {
  if (seed != null) return CELEBRATIONS[Math.abs(seed) % CELEBRATIONS.length];
  return pick(CELEBRATIONS, celebState);
}

export function pickWarmAck(seed?: number): string {
  if (seed != null) return WARM_ACKS[Math.abs(seed) % WARM_ACKS.length];
  return pick(WARM_ACKS, ackState);
}

export function lightHumor(
  kind: keyof typeof LIGHT_HUMOR,
  prefs: NinaVoicePrefs,
  financialStress: boolean,
): string | null {
  if (prefs.humor === "off" || financialStress) return null;
  const list = LIGHT_HUMOR[kind] ?? LIGHT_HUMOR.generic;
  return list[Math.floor(Date.now() / 60_000) % list.length];
}

export function inferHumorKind(text: string): keyof typeof LIGHT_HUMOR {
  const n = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/cafe|café|starbucks|delta/.test(n)) return "cafe";
  if (/continente|pingo|lidl|supermercado|auchan|mercadona/.test(n)) return "supermarket";
  if (/bp|galp|repsol|prio|combustivel|gasolina|gasoleo/.test(n)) return "fuel";
  return "generic";
}

/**
 * Empatia: nunca culpar. Transforma mensagens frias em acompanhamento.
 */
export function softenBudgetMessage(usedPercent: number): { title: string; body: string } {
  if (usedPercent >= 100) {
    return {
      title: "Vamos olhar para o orçamento juntos",
      body: "Este mês ultrapassaste um pouco o orçamento. Sem stress — vamos ver juntos onde podemos compensar nas próximas semanas.",
    };
  }
  if (usedPercent >= 75) {
    return {
      title: "Orçamento a precisar de atenção",
      body: `Já usaste cerca de ${usedPercent}% do plano deste mês. Ainda dá para equilibrar — eu ajudo-te a escolher o que importa mais agora.`,
    };
  }
  return {
    title: "Orçamento a caminho",
    body: `Estás a ${usedPercent}% do plano. Bom ritmo.`,
  };
}

export function softenCategorySpike(categoryName: string): string {
  return `Os gastos em ${categoryName} pesaram um pouco mais este mês. Vamos tentar equilibrar isso nas próximas semanas — sem culpas, só com calma.`;
}

export function softenGoalRisk(goalName: string, shortfallLabel: string): string {
  return `Para “${goalName}”, com o ritmo atual pode faltar cerca de ${shortfallLabel}. Se quiseres, ajustamos o plano juntos — um passo de cada vez.`;
}

/** Encurta ou mantém texto conforme preferência de comprimento. */
export function shapeLength(text: string, prefs: NinaVoicePrefs): string {
  if (prefs.replyLength !== "short") return text;
  const parts = text.split(/\n\n+/).filter(Boolean);
  if (parts.length <= 1) return text;
  // Keep first paragraph + last actionable line if present
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (last !== first && /(queres|posso|vamos|se quiseres)/i.test(last)) {
    return `${first}\n\n${last}`;
  }
  return first;
}

export function composeReply(opts: {
  lines: string[];
  prefs?: NinaVoicePrefs;
  financialStress?: boolean;
}): string {
  const prefs = opts.prefs ?? DEFAULT_VOICE;
  const joined = opts.lines.filter(Boolean).join("\n\n");
  return shapeLength(joined, prefs);
}

/** Aprende estilo a partir do comprimento típico das perguntas. */
export function learnReplyLengthFromQuestion(question: string, current: ReplyLength): ReplyLength {
  const words = question.trim().split(/\s+/).length;
  if (words <= 6) return "short";
  if (words >= 18) return "detailed";
  return current === "auto" as never ? "balanced" : current;
}

export function resolveVoicePrefs(input: {
  replyStyle?: string | null;
  humor?: string | null;
  recentQuestion?: string | null;
}): NinaVoicePrefs {
  const styleRaw = (input.replyStyle || "auto").toLowerCase();
  const humorRaw = (input.humor || "auto").toLowerCase();

  let replyLength: ReplyLength = "balanced";
  let source: NinaVoicePrefs["source"] = "auto";

  if (styleRaw === "short" || styleRaw === "detailed" || styleRaw === "balanced") {
    replyLength = styleRaw;
    source = "user";
  } else if (input.recentQuestion) {
    const words = input.recentQuestion.trim().split(/\s+/).length;
    replyLength = words <= 6 ? "short" : words >= 18 ? "detailed" : "balanced";
  }

  let humor: HumorLevel = "light";
  if (humorRaw === "off" || humorRaw === "light") {
    humor = humorRaw;
    source = "user";
  } else if (humorRaw === "auto" && input.recentQuestion) {
    // Sem sinais claros → light; perguntas muito formais → off
    const formal = /(por favor|gostaria|poderia|relatorio|relatório|analise|análise)/i.test(
      input.recentQuestion,
    );
    humor = formal ? "off" : "light";
  }

  return { replyLength, humor, source };
}

/** @deprecated Prefer NINA_MISSION_LINE / NINA_SIMPLE_RULE from mission.ts */
export const NINA_PHILOSOPHY = NINA_SIMPLE_RULE;

export const NINA_MISSION_TAGLINE = NINA_MISSION_LINE;

export const NATURAL_EXAMPLES = [
  "Gastei 22 euros na BP",
  "Coloca 50 euros nas férias",
  "Quanto me resta para supermercado?",
  "Onde foi o meu dinheiro esta semana?",
  "Consigo ir jantar fora este fim de semana?",
];
