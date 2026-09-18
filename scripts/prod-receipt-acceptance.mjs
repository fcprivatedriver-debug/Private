/**
 * Full Production acceptance: JPEG + PDF receipt save + persistence.
 * BASE_URL=https://www.addandknow.pt EMAIL=… PASS=… node scripts/prod-receipt-acceptance.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const BASE = (process.env.BASE_URL || "https://www.addandknow.pt").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "familia@nina.app";
const PASS = process.env.PASS || "nina123";
const JPEG = process.env.JPEG || "/tmp/fatura-mini.jpg";
const PDF = process.env.PDF || "/tmp/fatura-mini.pdf";
const OUT = "/opt/cursor/artifacts/screenshots/receipt-prod-accept";
fs.mkdirSync(OUT, { recursive: true });

function ensureFixtures() {
  if (!fs.existsSync(JPEG) || fs.statSync(JPEG).size < 50) {
    // tiny valid-ish jpeg
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQDxAQDw8QDw8PDw8PDw8QFRUWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EADUQAAIBAwMCBAMFBQEAAAAAAAECAwAEEQUSITFBBhMiUWFxMoGRFEJSYbHB0fAVIzNy/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD0WiiigD//2Q==",
      "base64",
    );
    fs.writeFileSync(JPEG, jpeg);
  }
  if (!fs.existsSync(PDF) || fs.statSync(PDF).size < 50) {
    fs.writeFileSync(
      PDF,
      Buffer.from(
        "%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>endobj\n4 0 obj<< /Length 55 >>stream\nBT /F1 18 Tf 40 250 Td (Fatura PDF teste) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer<< /Size 5 /Root 1 0 R >>\nstartxref\n310\n%%EOF\n",
      ),
    );
  }
}

const results = {
  buildId: null,
  shaHint: null,
  loginOk: false,
  jpegOcr: { ok: false, error: null, body: null, uploadUrl: null, uploadStatus: null },
  jpegCaptura: { ok: false, error: null, body: null },
  pdfOcr: { ok: false, error: null, body: null, uploadUrl: null, uploadStatus: null },
  persistence: { ok: false, detail: null },
  logoutLogin: { ok: false, detail: null },
};

async function login(page) {
  await page.goto(BASE + "/pt/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForURL(/\/pt\/(dashboard|captura|hoje|despesas)/, { timeout: 45000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
  results.loginOk = /\/pt\/(dashboard|captura|hoje|despesas|ocr)/.test(page.url());
}

function parseActionBody(text) {
  // Next flight: 1:{"ok":...}
  const m = text.match(/\d+:(\{.*"ok"\s*:\s*(true|false).*?\})/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

async function main() {
  ensureFixtures();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const posts = [];

  page.on("response", async (res) => {
    const url = res.url();
    const ct = res.headers()["content-type"] || "";
    if (res.request().method() === "POST" && (url.includes("/pt/ocr") || url.includes("/pt/captura") || url.includes("/pt/despesas"))) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "";
      }
      const bm = body.match(/"b":"([^"]+)"/);
      if (bm) results.buildId = bm[1];
      posts.push({ url, status: res.status(), body: body.slice(0, 2000), parsed: parseActionBody(body) });
    }
    if (ct.includes("text/x-component") || bodyHasBuild(await softText(res))) {
      /* ignore */
    }
  });

  function bodyHasBuild() {
    return false;
  }
  async function softText() {
    return "";
  }

  console.log("BASE", BASE);
  await login(page);
  console.log("login", results.loginOk, page.url());
  await page.screenshot({ path: `${OUT}/01-login.png`, fullPage: true });

  // --- JPEG via OCR ---
  await page.goto(BASE + "/pt/ocr", { waitUntil: "networkidle", timeout: 60000 });
  const jpegInput = page.locator('input[type="file"]').first();
  await jpegInput.setInputFiles(JPEG);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/02-ocr-jpeg.png`, fullPage: true });
  const ocrText = await page.locator("body").innerText();
  const jpegPost = [...posts].reverse().find((p) => p.url.includes("/pt/ocr") && p.parsed);
  results.jpegOcr.body = jpegPost?.parsed || null;
  results.jpegOcr.ok = Boolean(jpegPost?.parsed?.ok === true);
  results.jpegOcr.error = jpegPost?.parsed?.error || (/Não foi possível guardar a fatura/i.test(ocrText) ? "UI error" : null);
  // Try extract upload url from UI / response
  const urlMatch = ocrText.match(/\/api\/uploads\/[^\s]+/) || JSON.stringify(jpegPost?.parsed || {}).match(/\/api\/uploads\/[^"\\]+/);
  if (urlMatch) {
    results.jpegOcr.uploadUrl = urlMatch[0];
    const up = await page.request.get(BASE + results.jpegOcr.uploadUrl);
    results.jpegOcr.uploadStatus = up.status();
  } else if (jpegPost?.parsed?.receiptImageUrl || jpegPost?.parsed?.url) {
    const u = jpegPost.parsed.receiptImageUrl || jpegPost.parsed.url;
    results.jpegOcr.uploadUrl = u;
    const up = await page.request.get(u.startsWith("http") ? u : BASE + u);
    results.jpegOcr.uploadStatus = up.status();
  }
  console.log("JPEG OCR", results.jpegOcr);

  // --- JPEG captura ---
  posts.length = 0;
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle", timeout: 60000 });
  const cap = page.locator('input[type="file"]').first();
  if ((await cap.count()) > 0) {
    await cap.setInputFiles(JPEG);
    await page.waitForTimeout(5000);
    await page.screenshot({ path: `${OUT}/03-captura-jpeg.png`, fullPage: true });
    const capPost = [...posts].reverse().find((p) => p.url.includes("/pt/captura") && p.parsed);
    results.jpegCaptura.body = capPost?.parsed || null;
    results.jpegCaptura.ok = Boolean(capPost?.parsed?.ok === true);
    results.jpegCaptura.error = capPost?.parsed?.error || null;
  }
  console.log("JPEG CAPTURA", results.jpegCaptura);

  // --- PDF via OCR ---
  posts.length = 0;
  await page.goto(BASE + "/pt/ocr", { waitUntil: "networkidle", timeout: 60000 });
  // Prefer pdf-accepting input if present
  let pdfInput = page.locator('input[type="file"][accept*="pdf"]').first();
  if ((await pdfInput.count()) === 0) pdfInput = page.locator('input[type="file"]').first();
  await pdfInput.setInputFiles(PDF);
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/04-ocr-pdf.png`, fullPage: true });
  const pdfPost = [...posts].reverse().find((p) => p.url.includes("/pt/ocr") && p.parsed);
  results.pdfOcr.body = pdfPost?.parsed || null;
  results.pdfOcr.ok = Boolean(pdfPost?.parsed?.ok === true);
  results.pdfOcr.error = pdfPost?.parsed?.error || null;
  const pdfUrl =
    pdfPost?.parsed?.receiptPdfUrl ||
    pdfPost?.parsed?.receiptImageUrl ||
    pdfPost?.parsed?.url ||
    null;
  if (pdfUrl) {
    results.pdfOcr.uploadUrl = pdfUrl;
    const up = await page.request.get(pdfUrl.startsWith("http") ? pdfUrl : BASE + pdfUrl);
    results.pdfOcr.uploadStatus = up.status();
  }
  console.log("PDF OCR", results.pdfOcr);

  // --- Persistence: nova despesa with attachment if we have url, else re-upload ---
  let attachedUrl = results.jpegOcr.uploadUrl || results.pdfOcr.uploadUrl;
  await page.goto(BASE + "/pt/despesas/nova", { waitUntil: "networkidle", timeout: 60000 });
  if (attachedUrl) {
    // If page supports prefill via query — otherwise attach file again
  }
  const attach = page.locator('input[type="file"]').first();
  if ((await attach.count()) > 0) {
    await attach.setInputFiles(JPEG);
    await page.waitForTimeout(1500);
  }
  const amount = page.locator('input[name="amount"], input[inputmode="decimal"], .expense-amount-input').first();
  if ((await amount.count()) > 0) await amount.fill("12,34");
  const desc = page.locator('input[name="description"], textarea[name="description"]').first();
  if ((await desc.count()) > 0) await desc.fill("Aceitação fatura d5c35fa");
  await page.screenshot({ path: `${OUT}/05-nova-before.png`, fullPage: true });
  const saveBtn = page.getByRole("button", { name: /Guardar|Pagar|Registar/i }).first();
  await saveBtn.click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/06-nova-after.png`, fullPage: true });
  const novaText = await page.locator("body").innerText();
  const novaFail = /Não foi possível guardar a fatura/i.test(novaText);
  results.persistence.ok = !novaFail && (/despesas|12[,.]34|Aceitação/i.test(novaText) || /\/pt\/despesas/.test(page.url()));
  results.persistence.detail = { url: page.url(), failMsg: novaFail, snippet: novaText.slice(0, 500) };
  console.log("PERSIST", results.persistence);

  // --- Logout / login ---
  await page.goto(BASE + "/pt/definicoes", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
  const logout = page.getByRole("button", { name: /Sair|Terminar|Logout/i }).or(page.locator('a[href*="logout"], button:has-text("Sair")'));
  if ((await logout.count()) > 0) {
    await logout.first().click();
    await page.waitForTimeout(2000);
  } else {
    // force clear cookies
    await context.clearCookies();
  }
  await login(page);
  await page.goto(BASE + "/pt/despesas", { waitUntil: "networkidle", timeout: 60000 });
  await page.screenshot({ path: `${OUT}/07-after-relogin.png`, fullPage: true });
  const listText = await page.locator("body").innerText();
  results.logoutLogin.ok = /Aceitação fatura d5c35fa|12[,.]34/.test(listText);
  results.logoutLogin.detail = listText.slice(0, 600);
  console.log("RELOGIN", results.logoutLogin.ok);

  // If upload url known, re-fetch after relogin
  if (results.jpegOcr.uploadUrl) {
    const up = await page.request.get(
      results.jpegOcr.uploadUrl.startsWith("http") ? results.jpegOcr.uploadUrl : BASE + results.jpegOcr.uploadUrl,
    );
    results.jpegOcr.uploadStatusAfterRelogin = up.status();
  }

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, postsTail: posts.slice(-5) }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
  await browser.close();

  const allOk =
    results.loginOk &&
    results.jpegOcr.ok &&
    results.jpegCaptura.ok &&
    results.pdfOcr.ok &&
    results.persistence.ok &&
    results.logoutLogin.ok;
  process.exit(allOk ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
