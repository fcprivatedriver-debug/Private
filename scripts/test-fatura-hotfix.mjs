/**
 * Preview tests obrigatórios — Fatura / storage / UI (hotfix camera+storage).
 * BASE_URL=http://localhost:3000 EMAIL=demo@nina.app PASS=nina123 node scripts/test-fatura-hotfix.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "demo@nina.app";
const PASS = process.env.PASS || "nina123";
const OUT = "/opt/cursor/artifacts/fatura-hotfix";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " — " + detail : ""}`);
}

function ensureFixtures() {
  const dir = path.join(OUT, "fixtures");
  fs.mkdirSync(dir, { recursive: true });
  const jpg = path.join(dir, "t.jpg");
  const png = path.join(dir, "t.png");
  const webp = path.join(dir, "t.webp");
  const pdf = path.join(dir, "t.pdf");
  if (!fs.existsSync(jpg) || !fs.existsSync(png) || !fs.existsSync(webp)) {
    execSync(
      `python3 - <<'PY'
from PIL import Image
img = Image.new("RGB", (96, 96), (40, 120, 90))
img.save(${JSON.stringify(jpg)}, "JPEG", quality=85)
img.save(${JSON.stringify(png)}, "PNG")
img.save(${JSON.stringify(webp)}, "WEBP")
print("fixtures ok")
PY`,
      { stdio: "inherit" },
    );
  }
  if (!fs.existsSync(pdf)) {
    fs.writeFileSync(
      pdf,
      "%PDF-1.1\n1 0 obj<<>>endobj\n2 0 obj<< /Length 0 >>stream\nendstream\nendobj\n3 0 obj<< /Type /Page /Parent 4 0 R /MediaBox [0 0 3 3] >>endobj\n4 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n5 0 obj<< /Type /Catalog /Pages 4 0 R >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000025 00000 n \n0000000078 00000 n \n0000000157 00000 n \n0000000224 00000 n \ntrailer<< /Size 6 /Root 5 0 R >>\nstartxref\n297\n%%EOF\n",
    );
  }
  return { jpg, png, webp, pdf };
}

async function login(page) {
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('input[name="email"]').fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([
    page.waitForURL(/\/pt\/(dashboard|captura|hoje|lista)/, { timeout: 45000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
}

/** Galeria da captura — NÃO o input de foto de perfil do header. */
function capturaGallery(page) {
  return page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').last();
}
function capturaPdf(page) {
  return page.locator('input[type="file"][accept*="pdf"]').last();
}

async function main() {
  const fixtures = ensureFixtures();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const actionBodies = [];
  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] || "";
    if (res.request().method() === "POST" && ct.includes("text/x-component")) {
      try {
        actionBodies.push((await res.text()).slice(0, 2000));
      } catch {
        /* ignore */
      }
    }
  });

  await login(page);
  await page.screenshot({ path: `${OUT}/01-login-dashboard.png`, fullPage: true });
  record("A login", /\/pt\//.test(page.url()) && !page.url().includes("/login"), page.url());

  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/02-fatura-opcoes.png`, fullPage: true });
  const bodyText = await page.locator("body").innerText();
  record(
    "B Fatura abre opções sem câmara auto",
    /Tirar fotografia/i.test(bodyText) &&
      /Escolher fotografia/i.test(bodyText) &&
      /Escolher PDF/i.test(bodyText) &&
      !page.url().includes("auto=1"),
    page.url(),
  );

  await page.goto(BASE + "/pt/captura?mode=photo&auto=1", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  record(
    "B2 legacy auto=1 photo ainda mostra botões (sem auto-click)",
    /Tirar fotografia/i.test(await page.locator("body").innerText()),
    page.url(),
  );
  await page.screenshot({ path: `${OUT}/02b-legacy-auto.png`, fullPage: true });

  await page.goto(BASE + "/pt/captura?mode=voice&auto=1", { waitUntil: "networkidle" });
  record("B3 voz auto=1 ainda disponível", page.url().includes("auto=1"), page.url());

  async function uploadGallery(filePath, label) {
    actionBodies.length = 0;
    await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
    await capturaGallery(page).setInputFiles(filePath);
    await page.waitForTimeout(5000);
    const text = await page.locator("body").innerText();
    const hasErr = /Não foi possível guardar/i.test(text);
    const hasSuccess = /Fatura guardada/i.test(text);
    const both = hasErr && hasSuccess;
    const prismaLeak =
      /prisma\.storedObject|InvalidArg|serde_json|JS functions cannot|Raw query failed/i.test(text);
    await page.screenshot({ path: `${OUT}/${label.replace(/\s+/g, "-")}.png`, fullPage: true });
    const receiptLink = page.locator('a[href*="/pt/despesas/nova?receipt="]').first();
    let receiptUrl = null;
    if (await receiptLink.count()) {
      const href = await receiptLink.getAttribute("href");
      const m = href && decodeURIComponent(href).match(/receipt=([^&]+)/);
      receiptUrl = m ? m[1] : null;
    }
    const leakedCreate = actionBodies.some((b) =>
      /storedObject\.create|InvalidArg|JS functions cannot/i.test(b),
    );
    record(
      label,
      hasSuccess && !hasErr && !both && !prismaLeak && !leakedCreate && Boolean(receiptUrl),
      `success=${hasSuccess} err=${hasErr} both=${both} leak=${prismaLeak || leakedCreate} url=${receiptUrl || "-"}`,
    );
    return receiptUrl;
  }

  const jpegUrl = await uploadGallery(fixtures.jpg, "C gallery JPEG");
  const pngUrl = await uploadGallery(fixtures.png, "D gallery PNG");
  const webpUrl = await uploadGallery(fixtures.webp, "E gallery WEBP");

  actionBodies.length = 0;
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  await capturaPdf(page).setInputFiles(fixtures.pdf);
  await page.waitForTimeout(5000);
  const pdfText = await page.locator("body").innerText();
  const pdfOk =
    /Fatura guardada/i.test(pdfText) &&
    !/Não foi possível guardar|prisma\.storedObject|InvalidArg/i.test(pdfText);
  await page.screenshot({ path: `${OUT}/F-pdf.png`, fullPage: true });
  let pdfUrl = null;
  const pdfLink = page.locator('a[href*="receipt="]').first();
  if (await pdfLink.count()) {
    const href = await pdfLink.getAttribute("href");
    const m = href && decodeURIComponent(href).match(/receipt=([^&]+)/);
    pdfUrl = m ? m[1] : null;
  }
  record("F PDF <5MB", pdfOk && Boolean(pdfUrl), pdfUrl || pdfText.slice(0, 200));

  async function checkUpload(url, label) {
    if (!url) {
      record(label, false, "no url");
      return;
    }
    const res = await page.request.get(BASE + url);
    const status = res.status();
    const ct = res.headers()["content-type"] || "";
    const buf = Buffer.from(await res.body());
    record(label, status === 200 && buf.length > 0, `status=${status} ct=${ct} bytes=${buf.length}`);
  }
  await checkUpload(jpegUrl, "G /api/uploads JPEG");
  await checkUpload(pngUrl, "G2 /api/uploads PNG");
  await checkUpload(webpUrl, "G3 /api/uploads WEBP");
  await checkUpload(pdfUrl, "G4 /api/uploads PDF");

  if (jpegUrl) {
    await page.reload({ waitUntil: "networkidle" });
    const res = await page.request.get(BASE + jpegUrl);
    record("H refresh — upload ainda acessível", res.status() === 200, `status=${res.status()}`);
  } else {
    record("H refresh — upload ainda acessível", false, "no jpegUrl");
  }

  await context.clearCookies();
  await login(page);
  if (jpegUrl) {
    const res = await page.request.get(BASE + jpegUrl);
    record("I logout/login — persistência", res.status() === 200, `status=${res.status()}`);
  } else {
    record("I logout/login — persistência", false, "no jpegUrl");
  }
  await page.screenshot({ path: `${OUT}/I-after-relogin.png`, fullPage: true });

  async function spaceUpload(spaceLabel, label) {
    await page.goto(BASE + "/pt/dashboard", { waitUntil: "networkidle" });
    const btn = page.getByRole("button", { name: new RegExp(`^${spaceLabel}$`, "i") }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(400);
    }
    await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
    await capturaGallery(page).setInputFiles(fixtures.jpg);
    await page.waitForTimeout(5000);
    const t = await page.locator("body").innerText();
    record(
      label,
      /Fatura guardada/i.test(t) && !/prisma\.storedObject|InvalidArg/i.test(t),
      t.match(/Fatura guardada|Não foi possível[^.\n]*/)?.[0] || "-",
    );
    await page.screenshot({ path: `${OUT}/${label.replace(/\s+/g, "-")}.png`, fullPage: true });
  }
  await spaceUpload("Pessoal", "J Pessoal — fatura");
  await spaceUpload("Familiar", "J2 Familiar — fatura");

  async function tryProfilePhoto(spaceLabel) {
    await page.goto(BASE + "/pt/dashboard", { waitUntil: "networkidle" });
    const btn = page.getByRole("button", { name: new RegExp(`^${spaceLabel}$`, "i") }).first();
    if (await btn.count()) await btn.click();
    await page.waitForTimeout(300);
    const profileInputs = page.locator(
      '.header-identity input[type="file"][accept*="image"], .space-avatar input[type="file"], input[type="file"][accept*="image/jpeg"][accept*="image/*"]',
    );
    let uploaded = false;
    const count = await profileInputs.count();
    if (count > 0) {
      try {
        await profileInputs.first().setInputFiles(fixtures.jpg);
        await page.waitForTimeout(4000);
        uploaded = true;
      } catch {
        uploaded = false;
      }
    }
    const t = await page.locator("body").innerText();
    const bad = /prisma\.storedObject|InvalidArg|JS functions cannot/i.test(t);
    const failMsg = /Não foi possível guardar a fotografia/i.test(t);
    await page.screenshot({ path: `${OUT}/K-perfil-${spaceLabel}.png`, fullPage: true });
    record(
      `K foto perfil ${spaceLabel}`,
      uploaded && !bad && !failMsg,
      `uploaded=${uploaded} bad=${bad} failMsg=${failMsg} inputs=${count}`,
    );
  }
  await tryProfilePhoto("Pessoal");
  await tryProfilePhoto("Familiar");

  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  record(
    "L botão Tirar fotografia presente (toque explícito)",
    (await page.getByRole("button", { name: /Tirar fotografia/i }).count()) > 0,
  );

  const [camChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: /Tirar fotografia/i }).click(),
  ]);
  await camChooser.setFiles(fixtures.jpg);
  await page.waitForTimeout(5000);
  const camText = await page.locator("body").innerText();
  record(
    "L2 câmara (toque explícito) guarda fatura",
    /Fatura guardada/i.test(camText) && !/prisma\.storedObject|InvalidArg/i.test(camText),
    camText.match(/Fatura guardada|Não foi possível[^.\n]*/)?.[0] || "-",
  );
  await page.screenshot({ path: `${OUT}/L2-camera-explicit.png`, fullPage: true });

  // Escopo ao painel .captura — há role=alert vazios noutros sítios do layout
  const captura = page.locator(".captura");
  const errCount = await captura.locator('[role="alert"]').count();
  const okCount = await captura.locator(".captura-result[role='status']").count();
  const capturaText = await captura.innerText();
  const bothInText =
    /Não foi possível guardar/i.test(capturaText) && /Fatura guardada/i.test(capturaText);
  record(
    "M UI mutuamente exclusiva após upload",
    !(errCount > 0 && okCount > 0) && !bothInText && okCount === 1,
    `errNodes=${errCount} okNodes=${okCount} bothInText=${bothInText}`,
  );
  await page.screenshot({ path: `${OUT}/M-ui-xor.png`, fullPage: true });

  await browser.close();

  const summary = {
    base: BASE,
    sha: process.env.GIT_SHA || "local",
    results,
    pass: results.filter((r) => r.pass).length,
    fail: results.filter((r) => !r.pass).length,
  };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(`PASS ${summary.pass} / FAIL ${summary.fail} / TOTAL ${results.length}`);
  if (summary.fail) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
