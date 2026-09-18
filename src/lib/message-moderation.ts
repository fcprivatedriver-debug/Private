/**
 * Deterministic server-side moderation for free-text fields exchanged
 * before payment confirmation — blocks obvious contact / off-platform outreach
 * without relying on AI. Applied only to message-like fields.
 */

export class MessageModerationError extends Error {
  code = "CONTACT_BLOCKED" as const;
  constructor(
    message = "Por segurança, os contactos são partilhados apenas após a confirmação da reserva.",
  ) {
    super(message);
    this.name = "MessageModerationError";
  }
}

const BLOCK_MESSAGE =
  "Por segurança, os contactos são partilhados apenas após a confirmação da reserva.";

/** Digits with optional spaces/hyphens/dots — phone-like sequences of 9+ digits. */
const PHONE_LIKE =
  /(?:\+|00)?\s*(?:351)?[\s.\-]*\d(?:[\s.\-]*\d){8,}/;

/** Email-like with optional spaces around @ and dots. */
const EMAIL_LIKE =
  /[a-z0-9][a-z0-9._+\-]*\s*@\s*[a-z0-9][a-z0-9.\-]*\s*\.\s*[a-z]{2,}/i;

/** URLs and bare domains. */
const URL_LIKE =
  /(?:https?:\/\/|www\.)\S+|(?:[a-z0-9-]+\.)+(?:com|pt|net|org|io|app|me|co|eu)\b/i;

/** Off-platform messengers / social. */
const MESSENGER_WORDS =
  /\b(?:whats?\s*app|wats?app|whatsapp|telegram|signal|instagram|insta|messenger|facebook|fb|tiktok|snapchat|discord|skype|viber|wechat|line)\b/i;

/** Portuguese spelled-out digit sequences (aggressive but scoped). */
const SPELLED_PHONE =
  /(?:(?:zero|um|dois|três|tres|quatro|cinco|seis|sete|oito|nove)[\s\-.,]*){6,}/i;

/** Soft contact solicitation. */
const CONTACT_SOLICIT =
  /\b(?:liga(?:\-|\s)?me|telefon(?:e|a)|meu\s+n[uú]mero|o\s+meu\s+contacto|contacta\-me|manda\s+(?:msg|mensagem)|fala\s+comigo\s+no|procura\-?me\s+no|escreve\-?me\s+para)\b/i;

/**
 * Returns null when the message is allowed, or a user-facing block reason.
 * Empty / whitespace-only messages are allowed.
 */
export function findContactLeak(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  const normalized = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—―]/g, "-");

  if (PHONE_LIKE.test(normalized)) return BLOCK_MESSAGE;
  if (EMAIL_LIKE.test(normalized)) return BLOCK_MESSAGE;
  if (URL_LIKE.test(normalized)) return BLOCK_MESSAGE;
  if (MESSENGER_WORDS.test(normalized)) return BLOCK_MESSAGE;
  if (SPELLED_PHONE.test(normalized)) return BLOCK_MESSAGE;
  if (CONTACT_SOLICIT.test(normalized)) return BLOCK_MESSAGE;

  // Compact digit run after stripping separators (933123456)
  const digitsOnly = normalized.replace(/\D/g, "");
  if (digitsOnly.length >= 9 && /(?:9\d{8}|2\d{8}|3519\d{8})/.test(digitsOnly)) {
    return BLOCK_MESSAGE;
  }

  return null;
}

/** Throws MessageModerationError when the text must be blocked. */
export function assertMessageAllowed(raw: string | null | undefined): void {
  const reason = findContactLeak(raw);
  if (reason) throw new MessageModerationError(reason);
}

/** Soft sanitize: strip blocked content is NOT used — we reject outright. */
export function moderateOfferMessage(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  assertMessageAllowed(text);
  return text;
}
