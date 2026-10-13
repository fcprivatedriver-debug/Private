import assert from "node:assert/strict";
import test from "node:test";
import { prismaDbExecuteArgs, redactDbHost, withConnectTimeout } from "./pg-url.mjs";

const SECRET = "postgresql://nina_user:s3cr3t-pass@ep-example-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

test("redactDbHost expõe só host e porta", () => {
  assert.equal(
    redactDbHost(SECRET),
    "ep-example-pooler.eu-central-1.aws.neon.tech:5432",
  );
  assert.equal(redactDbHost(""), "(vazio)");
  assert.equal(redactDbHost("não-é-url"), "(URL inválido)");
  assert.equal(redactDbHost(SECRET).includes("s3cr3t"), false);
  assert.equal(redactDbHost(SECRET).includes("nina_user"), false);
});

test("withConnectTimeout sobe o timeout do Neon sem mudar o host", () => {
  const next = withConnectTimeout(SECRET, 30);
  const u = new URL(next);
  assert.equal(u.hostname, "ep-example-pooler.eu-central-1.aws.neon.tech");
  assert.equal(u.username, "nina_user");
  assert.equal(u.password, "s3cr3t-pass");
  assert.equal(u.searchParams.get("sslmode"), "require");
  assert.equal(u.searchParams.get("connect_timeout"), "30");
});

test("withConnectTimeout não reduz um timeout já maior", () => {
  const url = `${SECRET}&connect_timeout=60`;
  const next = withConnectTimeout(url, 30);
  assert.equal(new URL(next).searchParams.get("connect_timeout"), "60");
});

test("withConnectTimeout mantém o host quando a password precisa de encoding", () => {
  const raw = "postgresql://user:p@ss word@ep-broken.neon.tech/db";
  const next = withConnectTimeout(raw, 30);
  const u = new URL(next);
  assert.equal(u.hostname, "ep-broken.neon.tech");
  assert.equal(decodeURIComponent(u.password), "p@ss word");
  assert.equal(u.searchParams.get("connect_timeout"), "30");
});

test("withConnectTimeout não reescreve uma string que não é URL", () => {
  const raw = "not a url";
  assert.equal(withConnectTimeout(raw, 30), "not a url?connect_timeout=30");
});

test("prisma db execute recebe --url e --stdin, nunca os dois modos", () => {
  const args = prismaDbExecuteArgs(SECRET);
  assert.deepEqual(args.slice(0, 3), ["db", "execute", "--url"]);
  assert.equal(args.at(-1), "--stdin");
  assert.equal(args.includes("--schema"), false);
  assert.equal(args.filter((part) => part === "--url").length, 1);
  const urlIndex = args.indexOf("--url");
  assert.equal(args[urlIndex + 1], SECRET);
});

test("prisma db execute sem URL falha antes de chamar o CLI", () => {
  assert.throws(() => prismaDbExecuteArgs(""), /DIRECT_URL ou DATABASE_URL/);
});
