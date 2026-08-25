import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, whatsappLinkWithMessage } from "@/lib/contact";
import { SERVICES } from "@/data/services";

describe("marketing contact helpers", () => {
  it("builds a WhatsApp message with all fields", () => {
    const msg = buildWhatsAppMessage({
      name: "Ana",
      phone: "933239595",
      email: "ana@example.com",
      service: "Jovens",
      date: "2026-09-01",
      time: "09:00",
      pickup: "Cascais",
      destination: "Lisboa",
      notes: "Ida e volta",
    });
    expect(msg).toContain("Ana");
    expect(msg).toContain("Jovens");
    expect(msg).toContain("Cascais");
    expect(msg).toContain("FC Private Driver");
  });

  it("encodes WhatsApp deep link", () => {
    const href = whatsappLinkWithMessage("Olá");
    expect(href).toContain("https://wa.me/351933239595");
    expect(href).toContain("text=");
  });

  it("exposes the ten service categories", () => {
    expect(SERVICES).toHaveLength(10);
    expect(SERVICES.map((s) => s.id)).toContain("motorista-disposicao");
  });
});
