/**
 * Gate de utterances MEL — evita OpenAI/mobilidade em input incompleto ou ambíguo.
 */
export type MelUtteranceGate =
  | { action: "complete"; message: string; suggestions: string[] }
  | { action: "finance_where" }
  | { action: "mobility"; mode: "fuel" | "ev" | "auto" }
  | { action: "continue" };

function normalize(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPLETE_SUGGESTIONS = [
  "Onde gastei mais este mês?",
  "Onde há carregadores perto de mim?",
  "Quanto gastei este mês?",
];

/**
 * Classifica o texto ANTES de parseMoneyIntent / OpenAI.
 * "ond" / "onde" sozinhos NÃO disparam mobilidade.
 */
export function gateMelUtterance(raw: string): MelUtteranceGate {
  const n = normalize(raw);
  if (!n) {
    return {
      action: "complete",
      message: "Diz-me em que te posso ajudar — por exemplo nas tuas despesas ou na mobilidade.",
      suggestions: COMPLETE_SUGGESTIONS,
    };
  }

  // Truncamentos / incompletos óbvios (ex.: "ond", "ond?", "oi")
  if (n.length <= 3 || n === "ond" || n === "onde") {
    return {
      action: "complete",
      message:
        "Ainda não percebi o que precisas. Completa a pergunta — por exemplo «onde gastei mais este mês?» ou «onde há carregadores perto de mim?».",
      suggestions: COMPLETE_SUGGESTIONS,
    };
  }

  const financeWhere =
    /(gastei|gastamos|gaste|gasto|despes|dinheiro|orcamento|orçamento|poup|categoria)/.test(n) &&
    /(onde|em que|qual)/.test(n);
  const mobilityEv =
    /(carregador|carregar|bateria|supercharger|ev\b|eletrico|electrico)/.test(n);
  const mobilityFuel =
    /(abastec|postos?|combustivel|gasolina|diesel|gasoleo)/.test(n);
  const nearMe = /(perto|proxim|ao meu lado|aqui perto)/.test(n);

  // Finanças com "onde" — nunca GPS
  if (financeWhere && !mobilityEv && !(mobilityFuel && nearMe)) {
    return { action: "finance_where" };
  }

  // Mobilidade explícita (com ou sem "onde")
  if (mobilityEv && (nearMe || /^onde\b/.test(n) || /carregar|bateria/.test(n))) {
    return { action: "mobility", mode: "ev" };
  }
  if (mobilityFuel && (nearMe || /abastec|gasolina|diesel|gasoleo/.test(n))) {
    return { action: "mobility", mode: "fuel" };
  }

  // "onde …" ambíguo sem sinal claro → pedir clarificação (NÃO GPS)
  if (/^onde\b/.test(n)) {
    return {
      action: "complete",
      message:
        "«Onde» pode ser finanças ou mobilidade. Queres saber onde gastaste, ou postos/carregadores perto de ti?",
      suggestions: COMPLETE_SUGGESTIONS,
    };
  }

  return { action: "continue" };
}
