/**
 * Canonical Preview acceptance — all critical gates.
 * BASE_URL=… EMAIL=… PASS=… node scripts/canonical-preview-acceptance.mjs
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "familia@nina.app";
const PASS = process.env.PASS || "nina123";
const JPEG = "/tmp/fatura-mini.jpg";
const PDF = "/tmp/fatura-mini.pdf";
const OUT = "/opt/cursor/artifacts/screenshots/canonical-preview";
fs.mkdirSync(OUT, { recursive: true });

const R = {
  preview: BASE,
  buildId: null,
  landing: { pass: false, detail: null },
  login: { pass: false, detail: null },
  loginWait10: { pass: false },
  loginRefresh: { pass: false },
  loginDirect: { pass: false },
  dashboard: { pass: false, detail: null },
  jpeg: { pass: false, detail: null, upload: null },
  pdf: { pass: false, detail: null, upload: null },
  storedObject: { pass: false, detail: null },
  persistence: { pass: false, detail: null },
  ocrFiction: { pass: false, detail: null },
  melOnd: { pass: false, detail: null },
  melFinance: { pass: false, detail: null },
  melLocation: { pass: false, detail: null },
  camera: { pass: false, detail: null },
  mic: { pass: false, detail: null },
};

function parseOk(body) {
  const idx = body.lastIndexOf('{"ok"');
  if (idx < 0) return null;
  try {
    return JSON.parse(body.slice(idx).split("\n")[0]);
  } catch {
    return null;
  }
}

async function login(page) {
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle", timeout: 90000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pt\/dashboard/, { timeout: 90000 });
  await page.waitForTimeout(800);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    permissions: [], // don't pre-grant
  });
  const page = await context.newPage();
  const posts = [];
  page.on("response", async (res) => {
    if (res.request().method() !== "POST") return;
    const url = res.url();
    if (!/\/pt\//.test(url)) return;
    let body = "";
    try {
      body = await res.text();
    } catch {
      return;
    }
    const bm = body.match(/"b":"([^"]+)"/);
    if (bm) R.buildId = bm[1];
    posts.push({ url, parsed: parseOk(body), body: body.slice(0, 800) });
  });

  // T1 landing
  await page.goto(BASE + "/pt", { waitUntil: "networkidle", timeout: 90000 });
  await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: true });
  const land = await page.locator("body").innerText();
  R.landing.pass =
    /Sabe onde vai/.test(land) &&
    !/1\.240/.test(land) &&
    !/386,40/.test(land) &&
    !/210,00/.test(land) &&
    !/landing-glance/.test(await page.content());
  R.landing.detail = land.slice(0, 400);

  // T2 Entrar → login
  await page.getByRole("link", { name: /Entrar|Já tenho conta/i }).first().click();
  await page.waitForURL(/\/pt\/login/, { timeout: 30000 });
  await page.waitForTimeout(1500);
  const hasEmail = (await page.locator('input[name="email"]').count()) > 0;
  const hasPass = (await page.locator('input[name="password"]').count()) > 0;
  R.login.pass = hasEmail && hasPass && /Olá outra vez|Palavra-passe|Email/i.test(await page.locator("body").innerText());
  R.login.detail = { url: page.url(), hasEmail, hasPass };
  await page.screenshot({ path: `${OUT}/02-login.png`, fullPage: true });

  // T3 wait 10s
  await page.waitForTimeout(10000);
  R.loginWait10.pass =
    page.url().includes("/pt/login") && (await page.locator('input[name="email"]').count()) > 0;

  // T4 refresh
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  R.loginRefresh.pass =
    page.url().includes("/pt/login") && (await page.locator('input[name="email"]').count()) > 0;

  // T4b direct
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle" });
  R.loginDirect.pass = (await page.locator('input[name="email"]').count()) > 0;

  // T5 dashboard
  await login(page);
  await page.screenshot({ path: `${OUT}/03-dashboard.png`, fullPage: true });
  const dash = await page.locator("body").innerText();
  R.dashboard.pass =
    /O que queres fazer/.test(dash) &&
    /Despesa/.test(dash) &&
    /Receita/.test(dash) &&
    /Agendar/.test(dash) &&
    /Mobilidade/.test(dash) &&
    /Compras/.test(dash) &&
    /Falar com a MEL/.test(dash) &&
    /Ver tudo/.test(dash);
  R.dashboard.detail = dash.slice(0, 500);

  // T6 JPEG OCR
  posts.length = 0;
  await page.goto(BASE + "/pt/ocr", { waitUntil: "networkidle", timeout: 90000 });
  await page.locator('input[type="file"][accept*="image/jpeg"]').setInputFiles(JPEG);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/04-jpeg.png`, fullPage: true });
  const jpegUi = await page.locator("body").innerText();
  const jpegPost = [...posts].reverse().find((p) => p.parsed && p.url.includes("/pt/ocr"));
  const jpegUrl = jpegPost?.parsed?.receiptUrl;
  R.jpeg.pass =
    !/Não foi possível guardar a fatura/i.test(jpegUi) &&
    Boolean(jpegUrl || /Guardada|introduz os dados|leitura automática ainda não/i.test(jpegUi));
  R.jpeg.detail = jpegPost?.parsed || jpegUi.slice(0, 400);
  if (jpegUrl) {
    const up = await page.request.get(jpegUrl.startsWith("http") ? jpegUrl : BASE + jpegUrl);
    R.jpeg.upload = { status: up.status(), bytes: (await up.body()).length };
    R.storedObject.pass = up.status() === 200 && (await up.body()).length > 0;
    R.storedObject.detail = { url: jpegUrl, status: up.status() };
  }

  // T7 PDF
  posts.length = 0;
  await page.goto(BASE + "/pt/ocr", { waitUntil: "networkidle" });
  await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(PDF);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/05-pdf.png`, fullPage: true });
  const pdfUi = await page.locator("body").innerText();
  const pdfPost = [...posts].reverse().find((p) => p.parsed && p.url.includes("/pt/ocr"));
  const pdfUrl = pdfPost?.parsed?.receiptUrl;
  R.pdf.pass =
    !/Não foi possível guardar a fatura/i.test(pdfUi) &&
    Boolean(pdfUrl || /Guardada|PDF|leitura automática ainda não/i.test(pdfUi));
  R.pdf.detail = pdfPost?.parsed || pdfUi.slice(0, 400);
  if (pdfUrl) {
    const up = await page.request.get(pdfUrl.startsWith("http") ? pdfUrl : BASE + pdfUrl);
    R.pdf.upload = { status: up.status(), ct: up.headers()["content-type"] };
    if (up.status() === 200) R.storedObject.pass = true;
  }

  // T9 OCR fiction
  R.ocrFiction.pass =
    !/24[,.]87|2487|produto A|produto B/i.test(jpegUi + pdfUi) &&
    /leitura automática ainda não|introduz|manual/i.test(jpegUi + pdfUi);
  R.ocrFiction.detail = "no fictitious totals in UI";

  // T8 persistence via captura → nova despesa
  posts.length = 0;
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  await page.locator('input[type="file"][accept*="image/jpeg"]').first().setInputFiles(JPEG);
  await page.waitForTimeout(5000);
  const cap = [...posts].reverse().find((p) => p.parsed?.receiptUrl);
  const receiptUrl = cap?.parsed?.receiptUrl;
  if (receiptUrl) {
    await page.goto(
      BASE + "/pt/despesas/nova?receipt=" + encodeURIComponent(receiptUrl),
      { waitUntil: "networkidle" },
    );
    for (const sel of ['input[name="amount"]', 'input[inputmode="decimal"]']) {
      if (await page.locator(sel).count()) {
        await page.locator(sel).first().fill("9,91");
        break;
      }
    }
    for (const sel of ['input[name="description"]', 'textarea[name="description"]']) {
      if (await page.locator(sel).count()) {
        await page.locator(sel).first().fill("Canonical preview fatura");
        break;
      }
    }
    await page.getByRole("button", { name: /Guardar/i }).first().click();
    await page.waitForTimeout(5000);
  }
  await context.clearCookies();
  await login(page);
  await page.goto(BASE + "/pt/despesas", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/06-persistence.png`, fullPage: true });
  const list = await page.locator("body").innerText();
  R.persistence.pass = /Canonical preview fatura|9[,.]91/.test(list);
  R.persistence.detail = list.slice(0, 500);
  if (receiptUrl) {
    const up = await page.request.get(receiptUrl.startsWith("http") ? receiptUrl : BASE + receiptUrl);
    R.persistence.detail = { ...(typeof R.persistence.detail === "object" ? R.persistence.detail : { list: R.persistence.detail }), uploadAfterRelogin: up.status() };
    if (up.status() !== 200) R.persistence.pass = false;
  }

  // T10–12 MEL
  await page.goto(BASE + "/pt/ia", { waitUntil: "networkidle", timeout: 90000 }).catch(() => null);
  if (!page.url().includes("/pt/ia")) {
    await page.goto(BASE + "/pt/captura?mode=voice", { waitUntil: "networkidle" });
  }
  // Prefer Mel chat on dashboard or /ia
  await page.goto(BASE + "/pt/dashboard", { waitUntil: "networkidle" });
  // Open Falar com a MEL if link
  const melLink = page.getByRole("link", { name: /Falar com a MEL/i });
  if (await melLink.count()) await melLink.first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/07-mel.png`, fullPage: true });

  async function askMel(text) {
    posts.length = 0;
    const input = page.locator('input[aria-label*="MEL"], input[placeholder*="gastei"], .nina-composer input').first();
    if ((await input.count()) === 0) return { ui: await page.locator("body").innerText(), parsed: null };
    await input.fill(text);
    await page.getByRole("button", { name: /Enviar/i }).first().click();
    await page.waitForTimeout(8000);
    const ui = await page.locator("body").innerText();
    const parsed = [...posts].reverse().find((p) => p.parsed)?.parsed;
    return { ui, parsed };
  }

  const ond = await askMel("ond");
  R.melOnd.pass =
    !/localiza|postos|carregador/i.test(ond.ui.slice(-800)) ||
    /completa|completar|percebi|finanças ou mobilidade|ainda não percebi/i.test(ond.ui.slice(-800));
  // stronger: must ask to complete
  R.melOnd.pass = /completa|completar|ainda não percebi|Onde gastei|carregadores perto/i.test(ond.ui.slice(-1200));
  R.melOnd.detail = ond.ui.slice(-600);

  const fin = await askMel("onde gastei mais este mês?");
  R.melFinance.pass =
    !/Permitir localiza|preciso da tua localiza|postos ou carregadores perto/i.test(fin.ui.slice(-900));
  R.melFinance.detail = fin.ui.slice(-600);

  const loc = await askMel("onde há carregadores perto de mim?");
  R.melLocation.pass =
    /Permitir localiza|localiza/i.test(loc.ui.slice(-900)) &&
    (await page.getByRole("button", { name: /Permitir localiza/i }).count()) > 0;
  R.melLocation.detail = loc.ui.slice(-600);
  await page.screenshot({ path: `${OUT}/08-mel-location.png`, fullPage: true });

  // T15 camera inputs on captura
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  const cam = await page.locator('input[type="file"][capture]').count();
  const gal = await page.locator('input[type="file"][accept*="image/jpeg"]').count();
  R.camera.pass = cam > 0 && gal > 0;
  R.camera.detail = { captureInputs: cam, galleryInputs: gal };

  // T16 mic — voice mode should have speech UI without requesting on load
  await page.goto(BASE + "/pt/captura?mode=voice", { waitUntil: "networkidle" });
  const voiceUi = await page.locator("body").innerText();
  R.mic.pass = /falar|microfone|segurar|voz|Ouvir|Gravar/i.test(voiceUi);
  R.mic.detail = voiceUi.slice(0, 400);

  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();

  const critical = [
    R.landing,
    R.login,
    R.loginWait10,
    R.loginRefresh,
    R.loginDirect,
    R.dashboard,
    R.jpeg,
    R.pdf,
    R.storedObject,
    R.persistence,
    R.ocrFiction,
    R.melOnd,
    R.melFinance,
    R.melLocation,
  ];
  const ok = critical.every((x) => x.pass);
  process.exit(ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
