import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  canResendInvite,
  hashInviteToken,
  inviteExpiryDate,
  issueInviteToken,
  maskEmail,
  normalizeInviteEmail,
  resendCooldownSeconds,
  INVITE_RESEND_COOLDOWN_MS,
} from "@/lib/invites/tokens";
import { resolveInviteLifecycle, validateNewEmailInvite } from "@/lib/invites/lifecycle";
import { expenseScopeWhere, incomeScopeWhere } from "@/lib/scope";
import { canEditFinances, canManageMembers, PERMISSION_LABELS } from "@/domain/household";
import { appBaseUrl } from "@/lib/auth/security";

describe("family invite tokens", () => {
  it("emite token raw imprevisível e guarda só o hash", () => {
    const a = issueInviteToken();
    const b = issueInviteToken();
    assert.notEqual(a.raw, b.raw);
    assert.equal(a.hash, hashInviteToken(a.raw));
    assert.equal(a.hash.length, 64);
    assert.match(a.hash, /^[a-f0-9]{64}$/);
    assert.notEqual(a.raw, a.hash);
  });

  it("hash é sha256 estável (compatível com migration pgcrypto)", () => {
    const raw = "nina-demo-invite-token-seguro";
    const expected = createHash("sha256").update(raw).digest("hex");
    assert.equal(hashInviteToken(raw), expected);
  });

  it("valida e normaliza email (caso L)", () => {
    assert.equal(normalizeInviteEmail("  Joao@Email.PT "), "joao@email.pt");
    assert.equal(normalizeInviteEmail("invalido"), null);
    assert.equal(normalizeInviteEmail(""), null);
    assert.equal(normalizeInviteEmail("a@b"), null);
  });

  it("mascara email sem expor local completo", () => {
    assert.equal(maskEmail("joao@email.pt"), "jo***@email.pt");
    assert.equal(maskEmail("a@x.pt"), "a***@x.pt");
  });

  it("rate limit de reenvio (caso K)", () => {
    const now = new Date("2026-09-16T12:00:00Z");
    assert.equal(canResendInvite(null, now), true);
    assert.equal(
      canResendInvite(new Date(now.getTime() - INVITE_RESEND_COOLDOWN_MS - 1), now),
      true,
    );
    assert.equal(canResendInvite(new Date(now.getTime() - 30_000), now), false);
    assert.ok(resendCooldownSeconds(new Date(now.getTime() - 30_000), now) >= 1);
  });

  it("validade limitada por defeito", () => {
    const before = Date.now();
    const exp = inviteExpiryDate(14);
    assert.ok(exp.getTime() > before + 13 * 24 * 3600_000);
    assert.ok(exp.getTime() < before + 15 * 24 * 3600_000);
  });
});

describe("lifecycle convite (casos F/G/H/I/L/M/N)", () => {
  const base = {
    acceptedAt: null as Date | null,
    revokedAt: null as Date | null,
    expiresAt: new Date("2026-12-01"),
    inviteEmail: "joao@email.pt",
    sessionEmail: null as string | null,
    now: new Date("2026-09-16"),
  };

  it("caso F — expirado", () => {
    const r = resolveInviteLifecycle({
      ...base,
      expiresAt: new Date("2026-01-01"),
    });
    assert.equal(r.status, "expired");
  });

  it("caso G — já utilizado", () => {
    const r = resolveInviteLifecycle({
      ...base,
      acceptedAt: new Date("2026-09-01"),
    });
    assert.equal(r.status, "used");
  });

  it("caso H — cancelado", () => {
    const r = resolveInviteLifecycle({
      ...base,
      revokedAt: new Date("2026-09-01"),
    });
    assert.equal(r.status, "revoked");
  });

  it("caso I — email da sessão diferente", () => {
    const r = resolveInviteLifecycle({
      ...base,
      sessionEmail: "outra@email.pt",
    });
    assert.equal(r.status, "wrong_email");
  });

  it("caso L — email inválido", () => {
    const r = validateNewEmailInvite({
      emailRaw: "nao-email",
      alreadyMember: false,
      hasPendingDuplicate: false,
    });
    assert.equal(r.ok, false);
  });

  it("caso M — já membro", () => {
    const r = validateNewEmailInvite({
      emailRaw: "joao@email.pt",
      alreadyMember: true,
      hasPendingDuplicate: false,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /já é membro/i);
  });

  it("caso N — convite duplicado pendente", () => {
    const r = validateNewEmailInvite({
      emailRaw: "joao@email.pt",
      alreadyMember: false,
      hasPendingDuplicate: true,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /pendente/i);
  });
});

describe("separação Pessoal / Familiar (casos C/D/E)", () => {
  it("espaço pessoal filtra só memberId", () => {
    assert.deepEqual(expenseScopeWhere("personal", "mem-joao"), {
      scope: "PERSONAL",
      memberId: "mem-joao",
    });
    assert.deepEqual(incomeScopeWhere("personal", "mem-filipe"), {
      scope: "PERSONAL",
      memberId: "mem-filipe",
    });
  });

  it("espaço familiar só scope FAMILY", () => {
    assert.deepEqual(expenseScopeWhere("family", "mem-joao"), { scope: "FAMILY" });
    assert.deepEqual(incomeScopeWhere("family", "mem-filipe"), { scope: "FAMILY" });
  });
});

describe("roles e permissões", () => {
  it("labels OWNER/MEMBER correctos", () => {
    assert.equal(PERMISSION_LABELS.OWNER, "Proprietário");
    assert.equal(PERMISSION_LABELS.MEMBER, "Membro");
  });

  it("MEMBER edita finanças; VIEWER não; OWNER gere membros", () => {
    assert.equal(canEditFinances("MEMBER"), true);
    assert.equal(canEditFinances("VIEWER"), false);
    assert.equal(canManageMembers("OWNER"), true);
    assert.equal(canManageMembers("MEMBER"), false);
  });
});

describe("appBaseUrl produção", () => {
  it("em produção evita localhost/preview", () => {
    const prev = {
      VERCEL_ENV: process.env.VERCEL_ENV,
      AUTH_URL: process.env.AUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      APP_CANONICAL_URL: process.env.APP_CANONICAL_URL,
    };
    try {
      process.env.VERCEL_ENV = "production";
      process.env.AUTH_URL = "https://something.vercel.app";
      delete process.env.APP_CANONICAL_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      assert.equal(appBaseUrl(), "https://addandknow.pt");

      process.env.APP_CANONICAL_URL = "https://addandknow.pt";
      assert.equal(appBaseUrl(), "https://addandknow.pt");
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });
});
