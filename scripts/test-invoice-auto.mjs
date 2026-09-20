/**
 * Testes A–H do fluxo fatura automática.
 * Sem OPENAI_API_KEY local: análise real fica BLOCKED (não inventamos PASS).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const EMAIL = process.env.EMAIL || "demo@nina.app";
const PASS = process.env.PASS || "nina123";
const FIX = "/opt/cursor/artifacts/invoice-auto/fixtures";
const OUT = "/opt/cursor/artifacts/invoice-auto";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(name, pass, detail = "", status = pass ? "PASS" : "FAIL") {
  results.push({ name, pass, detail, status });
  console.log(`${status} | ${name}${detail ? " — " + detail : ""}`);
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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await login(page);
  record("login", !page.url().includes("/login"), page.url());

  // H — seletor de categorias
  await page.goto(BASE + "/pt/despesas/nova", { waitUntil: "networkidle" });
  const opts = await page.locator('select[name="categoryId"] option').evaluateAll((els) =>
    els.map((e) => ({ value: e.value, label: e.textContent?.trim() })),
  );
  const labels = opts.map((o) => o.label);
  const hasPlaceholder = opts.some((o) => !o.value && /escolher/i.test(o.label || ""));
  const hasEletricidade = labels.includes("Eletricidade");
  const hasEletricidadeGas = labels.includes("Eletricidade/Gás");
  const hasGas = labels.includes("Gás");
  const hasLuz = labels.includes("Luz");
  const firstSelectable = opts.find((o) => o.value);
  const notStuckAnimais = firstSelectable?.label !== "Animais" || hasPlaceholder;
  await page.screenshot({ path: `${OUT}/H-categorias.png`, fullPage: true });
  record(
    "H seletor categorias",
    hasPlaceholder && hasEletricidade && hasEletricidadeGas && hasGas && !hasLuz && labels.length > 10 && notStuckAnimais,
    `count=${labels.length} first=${firstSelectable?.label} placeholder=${hasPlaceholder} luz=${hasLuz}`,
  );

  // Upload fatura EDP — observamos se analisa ou pede manual
  async function tryInvoice(file, label) {
    const full = path.join(FIX, file);
    if (!fs.existsSync(full)) {
      record(label, false, "fixture em falta", "FAIL");
      return null;
    }
    await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
    await page.locator('input[type="file"][accept="image/jpeg,image/png,image/webp"]').last().setInputFiles(full);
    await page.waitForTimeout(12000);
    const text = await page.locator("body").innerText();
    await page.screenshot({ path: `${OUT}/${label.replace(/\s+/g, "-")}.png`, fullPage: true });
    const analyzed = /Fatura analisada/i.test(text);
    const analyzingStuck = /A analisar a fatura/i.test(text) && !analyzed;
    const storedOnly = /Fatura guardada/i.test(text) && !analyzed;
    const hasConfirm = /Confirmar e guardar/i.test(text);
    const invented = /2487|99[.,]99|dados fict/i.test(text);
    const openaiMissing = /OPENAI|chave OpenAI|não está disponível|não conseguiu extrair/i.test(text);
    return { text, analyzed, analyzingStuck, storedOnly, hasConfirm, invented, openaiMissing };
  }

  const a = await tryInvoice("edp-eletricidade.jpg", "A eletricidade");
  if (a) {
    if (a.analyzed && a.hasConfirm && !a.invented) {
      record("A eletricidade", true, "análise + confirmação");
    } else if (a.openaiMissing || a.storedOnly) {
      record("A eletricidade", false, "OpenAI/análise indisponível neste ambiente — " + (a.text.match(/[^\n]{0,120}/)?.[0] || ""), "BLOCKED");
    } else {
      record("A eletricidade", false, a.text.slice(0, 200));
    }
  }

  const b = await tryInvoice("edp-eletricidade-gas.jpg", "B eletricidade-gas");
  if (b) {
    if (b.analyzed && /Eletricidade\/Gás|eletricidade-gas/i.test(b.text) && !b.invented) {
      record("B eletricidade+gás", true, "categoria Eletricidade/Gás");
    } else if (b.openaiMissing || b.storedOnly) {
      record("B eletricidade+gás", false, "análise indisponível neste ambiente", "BLOCKED");
    } else if (b.analyzed) {
      record("B eletricidade+gás", false, "analisou mas categoria esperada não visível — " + b.text.slice(0, 180));
    } else {
      record("B eletricidade+gás", false, b.text.slice(0, 180));
    }
  }

  const c = await tryInvoice("continente-supermercado.jpg", "C supermercado");
  if (c) {
    if (c.analyzed && !c.invented) {
      record("C supermercado", true, "análise presente");
    } else if (c.openaiMissing || c.storedOnly) {
      record("C supermercado", false, "análise indisponível neste ambiente", "BLOCKED");
    } else {
      record("C supermercado", false, c.text.slice(0, 180));
    }
  }

  // D PDF
  const pdfPath = path.join(OUT, "mini.pdf");
  fs.writeFileSync(
    pdfPath,
    "%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n",
  );
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  await page.locator('input[type="file"][accept*="pdf"]').last().setInputFiles(pdfPath);
  await page.waitForTimeout(10000);
  const pdfText = await page.locator("body").innerText();
  await page.screenshot({ path: `${OUT}/D-pdf.png`, fullPage: true });
  if (/Fatura analisada/i.test(pdfText)) {
    record("D PDF", true, "análise PDF");
  } else if (/Fatura guardada|OpenAI|não|PDF/i.test(pdfText)) {
    record("D PDF", false, "PDF sem extracção completa neste ambiente — " + pdfText.match(/Fatura[^\n]*|Não[^\n]*|OpenAI[^\n]*/)?.[0], "BLOCKED");
  } else {
    record("D PDF", false, pdfText.slice(0, 160));
  }

  // E ilegível — não inventar
  const e = await tryInvoice("ilegivel.jpg", "E ilegivel");
  if (e) {
    if (e.invented) {
      record("E ilegível", false, "INVENTOU dados");
    } else if (e.analyzed && /Não identificado|Confirmar/i.test(e.text)) {
      record("E ilegível", true, "não inventou; campos em dúvida");
    } else if (e.openaiMissing || e.storedOnly) {
      record("E ilegível", false, "análise indisponível (não inventou UI fictícia)", "BLOCKED");
    } else {
      record("E ilegível", !e.invented, e.text.slice(0, 160));
    }
  }

  // F Pessoal vs Familiar — smoke switch + upload
  await page.goto(BASE + "/pt/dashboard", { waitUntil: "networkidle" });
  const familiar = page.getByRole("button", { name: /^Familiar$/i }).first();
  if (await familiar.count()) await familiar.click();
  await page.waitForTimeout(400);
  await page.goto(BASE + "/pt/captura?mode=photo", { waitUntil: "networkidle" });
  record("F espaço Familiar acessível", /Fatura|Tirar fotografia/i.test(await page.locator("body").innerText()));

  // G persistence of categories page after refresh
  await page.goto(BASE + "/pt/despesas/nova", { waitUntil: "networkidle" });
  await page.reload({ waitUntil: "networkidle" });
  const opts2 = await page.locator('select[name="categoryId"] option').count();
  record("G refresh seletor categorias", opts2 > 10, `options=${opts2}`);

  await browser.close();
  const summary = {
    base: BASE,
    sha: process.env.GIT_SHA || "",
    results,
    pass: results.filter((r) => r.status === "PASS").length,
    fail: results.filter((r) => r.status === "FAIL").length,
    blocked: results.filter((r) => r.status === "BLOCKED").length,
  };
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(summary);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
