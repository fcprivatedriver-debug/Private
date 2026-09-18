/**
 * Reproduce receipt save failure against a live base URL.
 * Captures server-action responses and console errors.
 *
 * BASE_URL=https://www.addandknow.pt EMAIL=… PASS=… node scripts/repro-receipt-save.mjs
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = (process.env.BASE_URL || "https://www.addandknow.pt").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "demo@nina.app";
const PASS = process.env.PASS || "nina123";
const FILE = process.env.FILE || "/tmp/fatura-mini.jpg";
const OUT = "/opt/cursor/artifacts/screenshots/receipt-repro";
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const serverMsgs = [];
  page.on("console", (msg) => {
    serverMsgs.push(`[console.${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => serverMsgs.push(`[pageerror] ${err.message}`));
  page.on("response", async (res) => {
    const url = res.url();
    if (
      url.includes("/pt/captura") ||
      url.includes("/pt/ocr") ||
      url.includes("/pt/despesas") ||
      res.headers()["content-type"]?.includes("text/x-component") ||
      res.request().method() === "POST"
    ) {
      let body = "";
      try {
        body = (await res.text()).slice(0, 1500);
      } catch {
        body = "<unreadable>";
      }
      serverMsgs.push(`[resp ${res.status()} ${res.request().method()}] ${url}\n${body}`);
    }
  });

  console.log("goto", BASE + "/pt/login");
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForURL(/\/pt\/(dashboard|captura|hoje)/, { timeout: 45000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1500);
  console.log("after login", page.url());
  await page.screenshot({ path: `${OUT}/01-after-login.png`, fullPage: true });

  // Try OCR page first (has explicit save after upload)
  await page.goto(BASE + "/pt/ocr", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `${OUT}/02-ocr.png`, fullPage: true });
  const gallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  if ((await gallery.count()) === 0) {
    console.log("NO gallery input — body:", (await page.locator("body").innerText()).slice(0, 400));
  } else {
    await gallery.setInputFiles(FILE);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/03-ocr-after-upload.png`, fullPage: true });
    const text = await page.locator("body").innerText();
    console.log("OCR UI TEXT:\n", text.slice(0, 1200));
    console.log("HAS_SAVE_ERROR", /Não foi possível guardar a fatura/i.test(text));
    console.log("HAS_STORED", /Guardada|Fatura guardada|Registar valor/i.test(text));
  }

  // Also captura photo
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `${OUT}/04-captura.png`, fullPage: true });
  const capGallery = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  if ((await capGallery.count()) > 0) {
    await capGallery.setInputFiles(FILE);
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/05-captura-after-upload.png`, fullPage: true });
    const text = await page.locator("body").innerText();
    console.log("CAPTURA UI TEXT:\n", text.slice(0, 1200));
    console.log("HAS_SAVE_ERROR", /Não foi possível guardar a fatura/i.test(text));
  }

  // Nova despesa attach + submit
  await page.goto(BASE + "/pt/despesas/nova", { waitUntil: "networkidle", timeout: 60000 });
  const attach = page.locator('input[type="file"][accept*="image/jpeg"]').first();
  if ((await attach.count()) > 0) {
    await attach.setInputFiles(FILE);
    await page.waitForTimeout(1000);
    await page.locator('input[name="amount"], .expense-amount-input').first().fill("12,34");
    await page.locator('input[name="description"]').fill("Repro fatura save");
    await page.screenshot({ path: `${OUT}/06-nova-before-save.png`, fullPage: true });
    await page.getByRole("button", { name: /Guardar/i }).first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/07-nova-after-save.png`, fullPage: true });
    console.log("NOVA TEXT:\n", (await page.locator("body").innerText()).slice(0, 800));
  }

  fs.writeFileSync(`${OUT}/network-log.txt`, serverMsgs.join("\n\n---\n\n"));
  console.log("Wrote", `${OUT}/network-log.txt`, "msgs", serverMsgs.length);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
