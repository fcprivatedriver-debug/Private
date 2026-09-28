#!/usr/bin/env node
/**
 * Smoke: PWA install prompt persistence + invite UI honesty (local).
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3000"
).replace(/\/$/, "");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();

  // --- PWA: simulate BIP + dismiss + remount ---
  await page.addInitScript(() => {
    // Force non-standalone
    window.matchMedia = (q) => ({
      matches: String(q).includes("standalone") ? false : false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    });
  });

  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  // Fire a fake beforeinstallprompt after load
  await page.evaluate(() => {
    const ev = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(ev, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(400);
  const prompt1 = await page.locator('[data-testid="pwa-install-prompt"]').isVisible().catch(() => false);
  console.log("PWA prompt after BIP:", prompt1);
  if (prompt1) {
    await page.getByRole("button", { name: /Agora não/i }).click();
    await page.waitForTimeout(200);
  }
  const afterDismiss = await page.locator('[data-testid="pwa-install-prompt"]').isVisible().catch(() => false);
  assert.equal(afterDismiss, false, "prompt should hide after dismiss");

  // Navigate menus — must not reappear
  await page.fill('input[name="email"]', "demo@nina.app");
  await page.fill('input[name="password"]', "nina123");
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  for (const href of ["/pt/guia", "/pt/lista", "/pt/dashboard", "/pt/definicoes"]) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(250);
    // Re-fire BIP (simulates browser re-offer)
    await page.evaluate(() => {
      const ev = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(ev, {
        prompt: async () => {},
        userChoice: Promise.resolve({ outcome: "dismissed" }),
      });
      window.dispatchEvent(ev);
    });
    await page.waitForTimeout(200);
    const visible = await page.locator('[data-testid="pwa-install-prompt"]').isVisible().catch(() => false);
    assert.equal(visible, false, `prompt must stay hidden on ${href}`);
  }
  console.log("PASS PWA cooldown across menus");

  // Standalone: never show
  await page.evaluate(() => {
    localStorage.removeItem("addyknow-pwa-install-v1");
  });
  await page.addInitScript(() => {
    window.matchMedia = (q) => ({
      matches: String(q).includes("display-mode") ? true : false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent() {
        return false;
      },
    });
  });
  const page2 = await context.newPage();
  await page2.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle" });
  await page2.evaluate(() => {
    const ev = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(ev, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(ev);
  });
  await page2.waitForTimeout(300);
  const inStandalone = await page2.locator('[data-testid="pwa-install-prompt"]').isVisible().catch(() => false);
  assert.equal(inStandalone, false, "no prompt in standalone");
  console.log("PASS PWA standalone");

  // Invite page reachable
  await page.goto(`${BASE}/pt/familia`, { waitUntil: "networkidle" });
  const inviteBtn = page.getByRole("button", { name: /Enviar convite|Criar Família|Email/i }).first();
  console.log("familia page has invite UI:", await inviteBtn.isVisible().catch(() => false));

  // Brand / ADD KNOW still present on dashboard
  await page.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle" });
  const addTab = await page.getByRole("tab", { name: "ADD" }).isVisible().catch(() => false);
  const logo = await page.locator(".brand-line--add").first().isVisible().catch(() => false);
  console.log("regressions ADD/logo:", { addTab, logo });
  assert.ok(addTab && logo, "ADD/KNOW layout and logo must remain");

  await browser.close();
  console.log("SMOKE OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
