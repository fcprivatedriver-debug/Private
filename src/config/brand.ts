/**
 * Identidade final de produção.
 *
 * AddYnow = aplicação / produto / marca (grafia exacta)
 * MEL     = assistente pessoal inteligente dentro da AddYnow
 *
 * Nunca chamar AddYnow à assistente.
 * Nunca substituir MEL por AddYnow.
 */

export const APP_NAME = "AddYnow";
export const ASSISTANT_NAME = "MEL";

/** Assinatura principal */
export const APP_TAGLINE = "Sabe onde vai o teu dinheiro. Agora.";

/** Assinatura curta */
export const APP_TAGLINE_SHORT = "Saber. Decidir. Poupar.";

/** Hero — linha de apoio */
export const APP_HERO_SUPPORT =
  "Percebe o que tens, quanto gastas, onde gastas e onde podes poupar.";

/** Menção elegante à assistente */
export const ASSISTANT_LINE = `Com a ${ASSISTANT_NAME}, a tua assistente inteligente.`;

/** Identidade da IA nos prompts de sistema */
export const ASSISTANT_SYSTEM_IDENTITY = `Tu és a ${ASSISTANT_NAME}, a assistente pessoal inteligente da ${APP_NAME}.`;

/** Conceito de marca (interno / docs de produto) */
export const BRAND_CONCEPT = "SABER AGORA.";

/** Domínio técnico actual — não inventar domínio novo */
export const TECHNICAL_DOMAIN = "ninapp.pt";

export const EMAIL_FROM_DEFAULT = `${APP_NAME} <no-reply@${TECHNICAL_DOMAIN}>`;
