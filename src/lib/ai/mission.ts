/**
 * Missão ADDYNOW + MEL
 *
 * ADDYNOW = produto / marca
 * MEL = assistente inteligente
 *
 * Conceito: SABER AGORA.
 */

import { APP_NAME, ASSISTANT_NAME, APP_TAGLINE, APP_TAGLINE_SHORT } from "@/config/brand";

/** Assinatura principal da app. */
export const NINA_SLOGAN = APP_TAGLINE;

/** Subtítulo oficial. */
export const NINA_SUBTITLE = APP_TAGLINE_SHORT;

/** Missão (duas linhas). */
export const NINA_MISSION = `${APP_TAGLINE}\n${APP_TAGLINE_SHORT}`;

export const NINA_MISSION_LINE = APP_TAGLINE;
export const NINA_MISSION_SHORT = APP_TAGLINE_SHORT;

export const NINA_PURPOSE =
  "Ajudar a pessoa a saber o que tem, quanto gasta, onde gasta e onde pode poupar — agora.";

export const NINA_CAPABILITIES = [
  "ver o que tens",
  "saber quanto gastas",
  "perceber onde gastas",
  "descobrir onde podes poupar",
  "organizar objectivos e hábitos",
  "acompanhar compras e agenda",
] as const;

export const NINA_INPUT_CHANNELS = [
  { id: "voice", label: "Voz", hint: `Fala com a ${ASSISTANT_NAME} como falarias com uma amiga.` },
  { id: "text", label: "Texto", hint: "Escreve em linguagem natural." },
  { id: "photo", label: "Fotografia", hint: `Fotografa a fatura — a ${ASSISTANT_NAME} lê.` },
] as const;

export const NINA_PRINCIPLES = [
  `Nunca obrigar o utilizador a adaptar-se à ${APP_NAME} — a aplicação adapta-se ao utilizador.`,
  `Usar a ${ASSISTANT_NAME} sempre que reduzir cliques, formulários ou burocracia.`,
  "Interpretar a intenção e executar a ação — sem comandos especiais.",
  "Voz primeiro — o microfone é a porta principal.",
  "Tarefas repetitivas → sugerir automatização.",
  "Dinheiro disponível → sugerir reforçar poupanças ou objectivos.",
  "Risco de orçamento → avisar de forma positiva e construtiva.",
  "Clareza, controlo, poupança, simplicidade e inteligência.",
] as const;

export const NINA_SIMPLE_RULE =
  "A tecnologia nunca deve complicar. Sempre que existirem duas formas, escolhe a mais simples.";

export function guidesDesignDecision(change: string): boolean {
  const c = change.toLowerCase();
  const bad =
    /obrig|formul[aá]rio complexo|aprender comando|culpa|julga|burocr/.test(c);
  const good =
    /simplif|reduz|automat|antecip|natural|voz|foto|poupan|positivo|empat|compra|saber|agora/.test(
      c,
    );
  if (bad) return false;
  return good;
}
