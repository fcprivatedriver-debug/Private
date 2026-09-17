import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

/**
 * Garante identidade PWA estável: mesmo `id` = update in-place.
 * Alterar `id` sem migração causa o aviso Android «substituir aplicação».
 */
describe("PWA identity (addYknow)", () => {
  const root = path.resolve(process.cwd());

  it("manifest mantém id/start_url/scope estáveis e nome addYknow", () => {
    const src = readFileSync(path.join(root, "src/app/manifest.ts"), "utf8");
    // Só o objecto de retorno conta (comentários podem mencionar o legado Mel).
    const body = src.slice(src.indexOf("return {"));
    assert.match(body, /id:\s*"\/pt\/dashboard"/);
    assert.match(body, /start_url:\s*"\/pt\/dashboard"/);
    assert.match(body, /scope:\s*"\/"/);
    assert.match(body, /name:\s*"addYknow"/);
    assert.match(body, /short_name:\s*"addYknow"/);
    assert.match(body, /theme_color:\s*"#39B8B2"/);
    assert.match(body, /background_color:\s*"#F7FAFA"/);
    assert.doesNotMatch(body, /id:\s*"\/pt\/hoje"/);
    assert.doesNotMatch(body, /\bNina\b|ADDYNOW|AddYnow|add&know/);
  });

  it("service worker usa cache addyknow e limpa eras legadas", () => {
    const src = readFileSync(path.join(root, "public/sw.js"), "utf8");
    assert.match(src, /CACHE_VERSION\s*=\s*"addyknow-v1"/);
    assert.match(src, /startsWith\("nina-"\)/);
    assert.match(src, /startsWith\("mel-"\)/);
    assert.doesNotMatch(src, /CACHE_VERSION\s*=\s*"nina-/);
  });

  it("metadata Next.js e offline usam addYknow", () => {
    const layout = readFileSync(path.join(root, "src/app/layout.tsx"), "utf8");
    assert.match(layout, /applicationName:\s*"addYknow"/);
    assert.match(layout, /apple-mobile-web-app-title" content="addYknow"/);
    const offline = readFileSync(path.join(root, "public/offline.html"), "utf8");
    assert.match(offline, /addYknow/);
    assert.doesNotMatch(offline, /\bNina\b|AddYnow|ADDYNOW/);
  });
});
