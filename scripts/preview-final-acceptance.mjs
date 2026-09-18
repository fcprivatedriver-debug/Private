/**
 * Strict Preview acceptance for login + invoice (PR production gate).
 * Usage: BASE_URL=https://… node scripts/preview-final-acceptance.mjs
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = "/opt/cursor/artifacts/screenshots/preview-final";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", file);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function assertLoginStable(page, label) {
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.waitForSelector('input[name="password"]', { timeout: 5000 });
  const url = page.url();
  assert(url.includes("/pt/login"), `${label}: URL not /pt/login: ${url}`);
  assert((await page.locator("#landing-hero-title").count()) === 0, `${label}: landing hero still visible`);
  assert((await page.getByRole("heading", { name: /Olá outra vez/i }).count()) > 0, `${label}: missing Olá outra vez`);
  console.log("PASS", label, url);
  // stay 10s
  await page.waitForTimeout(10000);
  assert(page.url().includes("/pt/login"), `${label}: URL drifted after 10s: ${page.url()}`);
  assert((await page.locator('input[name="email"]').count()) > 0, `${label}: email gone after 10s`);
  assert((await page.locator("#landing-hero-title").count()) === 0, `${label}: landing returned after 10s`);
  console.log("PASS", label, "stable 10s");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  // Landing
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await shot(page, "01-landing");
  const body = await page.locator("body").innerText();
  assert(!/1\.240,00/.test(body), "Landing has ficticious saldo");
  assert(!/386,40/.test(body), "Landing has ficticious despesas");
  assert(await page.getByRole("link", { name: /^Entrar$/ }).count(), "Missing Entrar");

  // Entrar
  await page.getByRole("link", { name: /^Entrar$/ }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, "02-login-after-entrar");
  await assertLoginStable(page, "Entrar");

  // refresh
  await page.reload({ waitUntil: "networkidle" });
  await assertLoginStable(page, "refresh");
  await shot(page, "03-login-after-refresh");

  // Já tenho conta from landing
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Já tenho conta/i }).first().click();
  await page.waitForTimeout(1500);
  await assertLoginStable(page, "Já tenho conta");

  // Hard nav
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await assertLoginStable(page, "hard-nav");

  // Login → dashboard
  await page.locator('input[name="email"]').fill("demo@nina.app");
  await page.locator('input[name="password"]').fill("nina123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pt\/dashboard/, { timeout: 30000 });
  await shot(page, "04-dashboard");
  const dash = await page.locator("body").innerText();
  assert(/Despesa/i.test(dash), "dashboard missing Despesa");
  assert(/Receita/i.test(dash), "dashboard missing Receita");
  assert(/Agendar/i.test(dash), "dashboard missing Agendar");
  assert(/Mobilidade/i.test(dash), "dashboard missing Mobilidade");
  assert(/Compras/i.test(dash), "dashboard missing Compras");
  assert(/Falar com a MEL|MEL/i.test(dash), "dashboard missing MEL");
  assert(/Ver tudo/i.test(dash), "dashboard missing Ver tudo");
  console.log("PASS dashboard tiles");

  // Invoice OCR page
  await page.goto(`${BASE}/pt/ocr`, { waitUntil: "networkidle" });
  await shot(page, "05-ocr");
  const ocr = await page.locator("body").innerText();
  assert(/Tirar fotografia/i.test(ocr), "missing camera");
  assert(/Escolher fotografia/i.test(ocr), "missing gallery");
  assert(/Escolher PDF/i.test(ocr), "missing pdf");
  assert(/leitura automática ainda não está disponível/i.test(ocr), "missing honest OCR message");
  assert(!/24,?87|Produto A/i.test(ocr), "ficticious OCR present");

  // Upload
  const jpeg = "/tmp/fatura-teste.jpg";
  if (!fs.existsSync(jpeg)) {
    // minimal jpeg
    fs.writeFileSync(
      jpeg,
      Buffer.from(
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAAAeJxhYXGBabaGlpd3d7h4eLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z",
        "base64",
      ),
    );
  }
  const gallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  await gallery.setInputFiles(jpeg);
  await page.waitForTimeout(3000);
  await shot(page, "06-ocr-after-upload");
  const after = await page.locator("body").innerText();
  assert(/Guardada|guardar|manualmente|ainda não está disponível/i.test(after), "upload did not show saved/manual state");
  assert(!/Produto A|24,?87/i.test(after), "OCR invented values after upload");

  // Captura photo
  await page.goto(`${BASE}/pt/captura?mode=photo`, { waitUntil: "networkidle" });
  await shot(page, "07-captura");
  const capturaGallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  await capturaGallery.setInputFiles(jpeg);
  await page.waitForTimeout(3000);
  await shot(page, "08-captura-stored");
  const cap = await page.locator("body").innerText();
  assert(/Fatura guardada|Registar valor/i.test(cap), "captura did not store");

  const link = page.getByRole("link", { name: /Registar valor e anexar fatura/i });
  if (await link.count()) {
    await link.click();
    await page.waitForTimeout(2000);
    await shot(page, "09-nova-preattached");
    const nova = await page.locator("body").innerText();
    assert(/Fatura anexada|já fotografada|Anexar fatura/i.test(nova), "preattach missing");
  }

  await browser.close();
  console.log("ALL PREVIEW ACCEPTANCE PASSED", BASE);
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
