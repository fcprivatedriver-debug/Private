/**
 * Mandatory: /pt → Entrar → /pt/login → form → login → /pt/dashboard
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots/preview-login-faturas";
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync("docs/pr-proof/preview-login-faturas", { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  fs.copyFileSync(file, path.join("docs/pr-proof/preview-login-faturas", `${name}.png`));
  console.log("PASS shot", name);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: "/opt/cursor/artifacts/preview-login-video", size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  // 1. Landing
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  const landingHtml = await page.content();
  if (!landingHtml.includes("Entrar")) throw new Error("Landing sem Entrar");
  if (landingHtml.includes("1.240,00")) throw new Error("Landing ainda tem saldo fictício");
  if (await page.locator('input[name="email"]').count()) throw new Error("Landing não deve mostrar form login");
  await shot(page, "01-landing");

  // 2. Click Entrar
  await page.getByRole("link", { name: /^Entrar$/ }).first().click();
  await page.waitForURL(/\/pt\/login/, { timeout: 15000 });
  console.log("PASS url after Entrar", page.url());

  // 3. Login form visible
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.waitForSelector('input[name="password"]', { timeout: 5000 });
  const title = await page.locator("h1").first().innerText();
  if (!/Olá outra vez/i.test(title)) throw new Error("Título login inesperado: " + title);
  // Must NOT still be landing hero
  if (await page.locator("#landing-hero-title").count()) {
    throw new Error("FAIL: /pt/login ainda mostra landing (layout quebrado)");
  }
  await shot(page, "02-login-form");
  console.log("PASS login form visible");

  // 4. Login
  await page.locator('input[name="email"]').fill("demo@nina.app");
  await page.locator('input[name="password"]').fill("nina123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pt\/dashboard/, { timeout: 30000 });
  console.log("PASS dashboard", page.url());
  await page.waitForTimeout(800);
  await shot(page, "03-dashboard");

  // 5. Spot-check invoice UI still present
  await page.goto(`${BASE}/pt/ocr`, { waitUntil: "networkidle" });
  await shot(page, "04-ocr-faturas");
  const ocrText = await page.locator("body").innerText();
  if (!/leitura automática ainda não está disponível/i.test(ocrText)) {
    throw new Error("OCR page missing honest copy");
  }
  if (!/Tirar fotografia/i.test(ocrText)) throw new Error("OCR missing camera button");

  await page.goto(`${BASE}/pt/captura?mode=photo`, { waitUntil: "networkidle" });
  await shot(page, "05-captura-foto");

  await context.close();
  await browser.close();

  const vids = fs.readdirSync("/opt/cursor/artifacts/preview-login-video").filter((f) => f.endsWith(".webm"));
  if (vids[0]) {
    const dest = "/opt/cursor/artifacts/preview-login-faturas-flow.webm";
    fs.renameSync(path.join("/opt/cursor/artifacts/preview-login-video", vids[0]), dest);
    console.log("video", dest);
  }
  console.log("ALL MANDATORY CHECKS PASSED");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
