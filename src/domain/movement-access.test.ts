import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReadMovement,
  resolveMovementMember,
  resolveMovementScope,
} from "./movement-access";

const family = ["mem-mor", "mem-filipe"];

describe("resolveMovementMember", () => {
  it("no pessoal usa sempre o membro autenticado quando o campo vem vazio", () => {
    const res = resolveMovementMember({
      scope: "PERSONAL",
      requestedMemberId: "",
      actorMemberId: "mem-mor",
      familyMemberIds: family,
    });
    assert.deepEqual(res, { ok: true, memberId: "mem-mor" });
  });

  it("rejeita memberId de outro membro num movimento pessoal", () => {
    const res = resolveMovementMember({
      scope: "PERSONAL",
      requestedMemberId: "mem-filipe",
      actorMemberId: "mem-mor",
      familyMemberIds: family,
    });
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.match(res.error, /outro membro/);
    }
  });

  it("no familiar aceita um membro da mesma família", () => {
    const res = resolveMovementMember({
      scope: "FAMILY",
      requestedMemberId: "mem-filipe",
      actorMemberId: "mem-mor",
      familyMemberIds: family,
    });
    assert.deepEqual(res, { ok: true, memberId: "mem-filipe" });
  });

  it("no familiar rejeita um membro de fora", () => {
    const res = resolveMovementMember({
      scope: "FAMILY",
      requestedMemberId: "mem-outra-familia",
      actorMemberId: "mem-mor",
      familyMemberIds: family,
    });
    assert.equal(res.ok, false);
  });

  it("no familiar omisso fica com o membro autenticado", () => {
    const res = resolveMovementMember({
      scope: "FAMILY",
      requestedMemberId: null,
      actorMemberId: "mem-mor",
      familyMemberIds: family,
    });
    assert.deepEqual(res, { ok: true, memberId: "mem-mor" });
  });
});

describe("canReadMovement", () => {
  it("esconde o pessoal de outro membro", () => {
    assert.equal(
      canReadMovement({
        scope: "PERSONAL",
        memberId: "mem-filipe",
        actorMemberId: "mem-mor",
      }),
      false,
    );
  });

  it("mostra o pessoal do próprio e o familiar da casa", () => {
    assert.equal(
      canReadMovement({
        scope: "PERSONAL",
        memberId: "mem-mor",
        actorMemberId: "mem-mor",
      }),
      true,
    );
    assert.equal(
      canReadMovement({
        scope: "FAMILY",
        memberId: "mem-filipe",
        actorMemberId: "mem-mor",
      }),
      true,
    );
  });
});

describe("resolveMovementScope", () => {
  it("ignora um âmbito manipulado e usa o de recurso", () => {
    assert.equal(
      resolveMovementScope({ requested: "PUBLIC", fallback: "PERSONAL" }),
      "PERSONAL",
    );
    assert.equal(
      resolveMovementScope({ requested: "family", fallback: "PERSONAL" }),
      "FAMILY",
    );
  });
});
