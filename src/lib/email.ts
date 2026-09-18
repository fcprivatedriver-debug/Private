/**
 * Tripvo admin notifications.
 *
 * Provider: Resend (https://resend.com) when RESEND_API_KEY is set.
 * Destination: ADMIN_NOTIFY_EMAIL (default fcprivatedriver@gmail.com).
 *
 * Failures must never roll back the primary business operation.
 */

import { APP_NAME } from "@/config/constants";

export const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL?.trim() || "fcprivatedriver@gmail.com";

type SendResult =
  | { sent: true; id?: string }
  | { sent: false; reason: string };

function fromAddress(): string {
  // Resend requires a verified domain for production from-addresses.
  // Override with EMAIL_FROM when available (e.g. Tripvo <noreply@tripvo.pt>).
  return (
    process.env.EMAIL_FROM?.trim() ||
    `${APP_NAME} <onboarding@resend.dev>`
  );
}

async function sendAdminEmail(input: {
  subject: string;
  text: string;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY missing — admin notification skipped:",
      input.subject,
    );
    return { sent: false, reason: "RESEND_API_KEY_MISSING" };
  }

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (input.idempotencyKey) {
      headers["Idempotency-Key"] = input.idempotencyKey.slice(0, 256);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: fromAddress(),
        to: [ADMIN_NOTIFY_EMAIL],
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, body.slice(0, 300));
      return { sent: false, reason: `RESEND_HTTP_${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id };
  } catch (error) {
    console.error("[email] send failed", error);
    return { sent: false, reason: "SEND_FAILED" };
  }
}

export async function notifyAdminNewDriver(input: {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  verificationStatus?: string;
}): Promise<SendResult> {
  const when = new Date().toISOString();
  const text = [
    `${APP_NAME} — novo motorista registado`,
    "",
    `Nome: ${input.name}`,
    `Email: ${input.email}`,
    `Telefone: ${input.phone || "—"}`,
    `Estado verificação: ${input.verificationStatus || "PENDING_VERIFICATION"}`,
    `ID interno: ${input.userId}`,
    `Data/hora (UTC): ${when}`,
  ].join("\n");

  return sendAdminEmail({
    subject: `${APP_NAME} — Novo motorista registado`,
    text,
    idempotencyKey: `driver-reg-${input.userId}`,
  });
}

export async function notifyAdminNewTrip(input: {
  tripId: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: Date | string;
  passengers: number;
  luggage?: number;
  category?: string | null;
  flightNumber?: string | null;
  notes?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
}): Promise<SendResult> {
  const when = new Date().toISOString();
  const pickupAt =
    input.pickupAt instanceof Date
      ? input.pickupAt.toISOString()
      : String(input.pickupAt);

  const text = [
    `${APP_NAME} — novo pedido de viagem`,
    "",
    `ID do pedido: ${input.tripId}`,
    `Origem: ${input.pickupAddress}`,
    `Destino: ${input.dropoffAddress}`,
    `Data/hora viagem: ${pickupAt}`,
    `Passageiros: ${input.passengers}`,
    `Bagagem: ${input.luggage ?? "—"}`,
    `Categoria: ${input.category || "—"}`,
    `Voo: ${input.flightNumber || "—"}`,
    `Observações: ${input.notes || "—"}`,
    "",
    `Cliente: ${input.customerName}`,
    `Email cliente: ${input.customerEmail || "—"}`,
    `Telefone cliente: ${input.customerPhone || "—"}`,
    `Notificação (UTC): ${when}`,
  ].join("\n");

  return sendAdminEmail({
    subject: `${APP_NAME} — Novo pedido de viagem`,
    text,
    idempotencyKey: `trip-${input.tripId}`,
  });
}
