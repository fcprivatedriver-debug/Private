import { describe, expect, it } from "vitest";
import {
  ACTIVATION_SUBJECT,
  ACTIVATION_TTL_HOURS,
  buildActivationEmailHtml,
  activationLink,
} from "@/lib/auth/activation";

describe("activation email", () => {
  it("uses the required subject and 24h TTL", () => {
    expect(ACTIVATION_SUBJECT).toBe("Bem-vindo à FC Private Driver — Ative a sua conta");
    expect(ACTIVATION_TTL_HOURS).toBe(24);
  });

  it("builds HTML with name, CTA and plain link", () => {
    const html = buildActivationEmailHtml("Maria Silva", "abc123token");
    expect(html).toContain("Olá, Maria Silva,");
    expect(html).toContain("Ativar Conta");
    expect(html).toContain("Este link expira ao fim de 24 horas.");
    expect(html).toContain("Equipa FC Private Driver");
    expect(html).toContain(activationLink("abc123token"));
    expect(html).not.toContain("<script");
  });

  it("escapes HTML in the name", () => {
    const html = buildActivationEmailHtml('<img src=x onerror=alert(1)>', "t");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
