/**
 * Focused PR #52 proof: login → OCR upload → manual form → captura photo UI.
 * Usage: node scripts/pr52-invoice-proof.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots/pr-52";
const REPO = path.join(process.cwd(), "docs/pr-proof/pr-52");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPO, { recursive: true });

const JPEG = "/tmp/fatura-teste.jpg";

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  fs.copyFileSync(file, path.join(REPO, `${name}.png`));
  console.log("shot", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: "/opt/cursor/artifacts/pr-52-video", size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await shot(page, "pw-01-login");
  await page.locator('input[name="email"]').fill("demo@nina.app");
  await page.locator('input[name="password"]').fill("nina123");
  await Promise.all([
    page.waitForURL(/\/pt\/(dashboard|hoje|captura)/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);

  await page.goto(`${BASE}/pt/ocr`, { waitUntil: "networkidle" });
  await shot(page, "pw-02-ocr-empty");

  // Upload via gallery input (second file input under OCR)
  const gallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  await gallery.setInputFiles(JPEG);
  await page.waitForTimeout(2500);
  await shot(page, "pw-03-ocr-after-upload");

  // Manual fields should be visible — fill and save
  const amount = page.locator('input[placeholder="0,00"]').first();
  if (await amount.count()) {
    await page.locator('input[placeholder="Ex: Continente"]').fill("Continente Teste");
    await amount.fill("12,34");
    await shot(page, "pw-04-ocr-manual-filled");
    await page.getByRole("button", { name: /Guardar despesa com fatura/i }).click();
    await page.waitForTimeout(2000);
    await shot(page, "pw-05-after-save");
  } else {
    console.log("WARN: manual form not open — message:", await page.locator(".muted, .form-error").allTextContents());
  }

  await page.goto(`${BASE}/pt/captura?mode=photo`, { waitUntil: "networkidle" });
  await shot(page, "pw-06-captura-photo");

  // Upload on captura
  const capturaGallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  await capturaGallery.setInputFiles(JPEG);
  await page.waitForTimeout(2500);
  await shot(page, "pw-07-captura-stored");

  // Follow link to nova despesa if present
  const link = page.getByRole("link", { name: /Registar valor e anexar fatura/i });
  if (await link.count()) {
    await link.click();
    await page.waitForTimeout(1500);
    await shot(page, "pw-08-nova-preattached");
  }

  await page.goto(`${BASE}/pt/despesas/nova`, { waitUntil: "networkidle" });
  await shot(page, "pw-09-nova-despesa");

  await context.close();
  await browser.close();

  // move video
  const vids = fs.readdirSync("/opt/cursor/artifacts/pr-52-video").filter((f) => f.endsWith(".webm"));
  if (vids[0]) {
    const dest = "/opt/cursor/artifacts/pr-52-invoice-photo-flow.webm";
    fs.renameSync(path.join("/opt/cursor/artifacts/pr-52-video", vids[0]), dest);
    fs.copyFileSync(dest, path.join(REPO, "invoice-photo-flow.webm"));
    console.log("video", dest);
  }
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
