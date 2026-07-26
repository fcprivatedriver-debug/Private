/**
 * Missão e filosofia final da Nina — princípio orientador de produto, UX e código.
 *
 * Slogan oficial: "Controla. Poupa. Vive."
 * Subtítulo: "A tua assistente financeira pessoal."
 */

/** Slogan oficial. */
export const NINA_SLOGAN = "Controla. Poupa. Vive.";

/** Subtítulo oficial. */
export const NINA_SUBTITLE = "A tua assistente financeira pessoal.";

/** Missão oficial (duas linhas) — mantém o espírito humano. */
export const NINA_MISSION = "Controla. Poupa. Vive.\nA tua assistente financeira pessoal.";

/** Uma linha para meta, sidebar e rodapés. */
export const NINA_MISSION_LINE = "Controla. Poupa. Vive.";

/** Versão curta para espaços apertados. */
export const NINA_MISSION_SHORT = "Controla. Poupa. Vive.";

export const NINA_PURPOSE =
  "Retirar preocupação ao utilizador relativamente ao dinheiro e às compras — acompanhá-lo diariamente com compreensão, organização e antecipação.";

/** Capacidades que a Nina deve sempre cumprir. */
export const NINA_CAPABILITIES = [
  "compreender",
  "organizar",
  "aprender",
  "antecipar necessidades",
  "sugerir melhorias",
  "simplificar tarefas",
  "ajudar nas compras",
] as const;

/** Canais naturais de entrada — voz em primeiro lugar. */
export const NINA_INPUT_CHANNELS = [
  { id: "voice", label: "Voz", hint: "Fala como falarias com uma amiga." },
  { id: "text", label: "Texto", hint: "Escreve em linguagem natural." },
  { id: "photo", label: "Fotografia", hint: "Fotografa a fatura — a Nina lê." },
] as const;

/**
 * Princípios de decisão (ordem importa).
 * Se uma alteração violar um princípio, deve existir caminho melhor.
 */
export const NINA_PRINCIPLES = [
  "Nunca obrigar o utilizador a adaptar-se à aplicação — a aplicação adapta-se ao utilizador.",
  "Usar IA sempre que reduzir cliques, formulários ou burocracia.",
  "Interpretar a intenção e executar a ação — sem comandos especiais.",
  "Voz primeiro — o microfone é a porta principal.",
  "Tarefas repetitivas → sugerir automatização.",
  "Dinheiro disponível → sugerir reforçar poupanças ou objetivos.",
  "Risco de orçamento → avisar de forma positiva e construtiva.",
  "Transmitir a sensação de alguém ao lado, a organizar a vida financeira e as compras.",
] as const;

/** Filosofia técnica (complementa a missão). */
export const NINA_SIMPLE_RULE =
  "A tecnologia nunca deve complicar. Sempre que existirem duas formas, escolhe a mais simples.";

export function guidesDesignDecision(change: string): boolean {
  const c = change.toLowerCase();
  const bad =
    /obrig|formul[aá]rio complexo|aprender comando|culpa|julga|burocr/.test(c);
  const good =
    /simplif|reduz|automat|antecip|natural|voz|foto|poupan|positivo|empat|compra/.test(c);
  if (bad) return false;
  return good;
}
