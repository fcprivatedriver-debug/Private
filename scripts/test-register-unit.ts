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
    assert.equal(mapped.code, "VALIDATION");
  }
}

function expectOk(input: unknown) {
  const result = registerSchema.safeParse(input);
  assert.equal(result.success, true, JSON.stringify(result));
}

expectOk({
  name: "Ana Motorista",
  email: "ana@zelu.app",
  password: "zelu1234",
  phone: "+351912345678",
  role: "DRIVER",
});

expectOk({
  name: "Cliente",
  email: "cli@zelu.app",
  password: "zelu1234",
  phone: "",
  role: "CUSTOMER",
});

expectFail(
  { name: "A", email: "a@zelu.app", password: "zelu1234", role: "DRIVER" },
  "nome",
);
expectFail(
  { name: "Ana", email: "not-an-email", password: "zelu1234", role: "DRIVER" },
  "email",
);
expectFail(
  { name: "Ana", email: "a@zelu.app", password: "123", role: "DRIVER" },
  "password|palavra",
);
expectFail(
  { name: "Ana", email: "a@zelu.app", password: "zelu1234", phone: "abc", role: "DRIVER" },
  "telefone",
);

const domain = toActionFailure(new DomainError("X", "Pedido inválido"));
assert.equal(domain.error, "Pedido inválido");
assert.equal(domain.code, "X");

const zod = toActionFailure(
  new ZodError([{ code: "custom", message: "Email já registado.", path: ["email"] }]),
);
assert.equal(zod.error, "Email já registado.");

console.log("REGISTER_UNIT_OK");
