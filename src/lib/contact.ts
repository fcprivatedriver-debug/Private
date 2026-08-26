import { BRAND } from "@/config/brand";

export type ServiceRequestPayload = {
  name: string;
  phone: string;
  email: string;
  service: string;
  date?: string;
  time?: string;
  pickup?: string;
  destination?: string;
  notes?: string;
};

export function buildWhatsAppMessage(data: ServiceRequestPayload): string {
  const lines = [
    "Olá, gostaria de pedir informação sobre um serviço FC Private Driver.",
    "",
    `Nome: ${data.name || "—"}`,
    `Telefone: ${data.phone || "—"}`,
    `Email: ${data.email || "—"}`,
    `Serviço: ${data.service || "—"}`,
    `Data: ${data.date || "—"}`,
    `Hora: ${data.time || "—"}`,
    `Recolha: ${data.pickup || "—"}`,
    `Destino: ${data.destination || "—"}`,
    `Observações: ${data.notes || "—"}`,
  ];
  return lines.join("\n");
}

export function whatsappLinkWithMessage(message: string): string {
  return `${BRAND.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(data: ServiceRequestPayload): string {
  const subject = "Pedido de serviço — FC Private Driver";
  const body = buildWhatsAppMessage(data);
  return `mailto:${BRAND.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
