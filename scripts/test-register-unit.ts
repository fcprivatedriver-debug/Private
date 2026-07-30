import assert from "node:assert/strict";
import { registerSchema } from "../src/lib/validators";
import { toActionFailure } from "../src/lib/action-errors";
import { ZodError } from "zod";
import { DomainError } from "../src/domain/marketplace";

function expectFail(input: unknown, includes: string) {
  const result = registerSchema.safeParse(input);
  assert.equal(result.success, false, `expected fail for ${JSON.stringify(input)}`);
  if (!result.success) {
    const mapped = toActionFailure(result.error);
    assert.match(mapped.error, new RegExp(includes, "i"), mapped.error);
  }
}

assert.equal(
  registerSchema.safeParse({
    name: "Ana Motorista",
    email: "ana@zelu.app",
    password: "zelu1234",
    phone: "+351912345678",
    role: "DRIVER",
  }).success,
  true,
);

assert.equal(
  registerSchema.safeParse({
    name: "Cliente",
    email: "cli@zelu.app",
    password: "zelu1234",
    phone: "",
    role: "CUSTOMER",
  }).success,
  true,
);

expectFail({ name: "A", email: "a@zelu.app", password: "zelu1234", role: "DRIVER" }, "nome");
expectFail({ name: "Ana", email: "bad", password: "zelu1234", role: "DRIVER" }, "email");
expectFail({ name: "Ana", email: "a@zelu.app", password: "123", role: "DRIVER" }, "password|palavra");
expectFail({ name: "Ana", email: "a@zelu.app", password: "zelu1234", phone: "abc", role: "DRIVER" }, "telefone");

assert.equal(toActionFailure(new DomainError("X", "Pedido inválido")).error, "Pedido inválido");
assert.equal(
  toActionFailure(new ZodError([{ code: "custom", message: "Email já registado.", path: ["email"] }])).error,
  "Email já registado.",
);

console.log("REGISTER_UNIT_OK");
