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
    assert.match(src, /id:\s*"\/pt\/dashboard"/);
    assert.match(src, /start_url:\s*"\/pt\/dashboard"/);
    assert.match(src, /scope:\s*"\/"/);
    assert.match(src, /name:\s*"addYknow"/);
    assert.match(src, /short_name:\s*"addYknow"/);
    assert.match(src, /theme_color:\s*"#39B8B2"/);
    assert.match(src, /background_color:\s*"#F7FAFA"/);
    assert.doesNotMatch(src, /id:\s*"\/pt\/hoje"/);
    assert.doesNotMatch(src, /Nina|ADDYNOW|AddYnow|add&know/i);
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
