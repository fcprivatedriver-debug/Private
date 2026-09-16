/**
 * Normalização de telemóvel para E.164 (foco PT).
 * Não autentica — só prepara dados para futuros OTP/SMS.
 */

export function normalizePhoneE164(
  raw: string,
  defaultCountry = "PT",
): string | null {
  const cleaned = String(raw || "").trim().replace(/[\s().-]/g, "");
  if (!cleaned) return null;

  let digits = cleaned;
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;

  if (digits.startsWith("+")) {
    const only = `+${digits.slice(1).replace(/\D/g, "")}`;
    return only.length >= 9 && only.length <= 16 ? only : null;
  }

  const nums = digits.replace(/\D/g, "");
  if (defaultCountry === "PT") {
    // 9XXXXXXXX → +3519XXXXXXXX
    if (/^9\d{8}$/.test(nums)) return `+351${nums}`;
    if (/^3519\d{8}$/.test(nums)) return `+${nums}`;
  }

  if (nums.length >= 8 && nums.length <= 15) return `+${nums}`;
  return null;
}

export function formatPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return "";
  if (e164.startsWith("+351") && e164.length === 13) {
    return `${e164.slice(0, 4)} ${e164.slice(4, 7)} ${e164.slice(7, 10)} ${e164.slice(10)}`;
  }
  return e164;
}
