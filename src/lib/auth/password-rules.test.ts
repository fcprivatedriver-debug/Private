import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passwordCheckState, validatePassword } from "./password-rules";
import { roleLabel } from "@/domain/household";

describe("password checks", () => {
  it("marca requisitos sem enfraquecer a validação do servidor", () => {
    const weak = passwordCheckState("abc");
    assert.equal(weak.every((rule) => !rule.met), true);
    const strong = passwordCheckState("Exemplo2026!");
    assert.equal(strong.every((rule) => rule.met), true);
    assert.equal(validatePassword("Exemplo2026!").ok, true);
    assert.equal(validatePassword("abc").ok, false);
  });
});

describe("róis visíveis", () => {
  it("traduz MEMBER para Membro e não para Editor", () => {
    assert.equal(roleLabel("MEMBER"), "Membro");
    assert.equal(roleLabel("OWNER"), "Proprietário");
    assert.equal(roleLabel("ADMIN"), "Administrador");
    assert.equal(roleLabel("VIEWER"), "Apenas consulta");
  });
});