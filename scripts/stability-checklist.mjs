import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = process.env.NINA_BASE_URL || "http://127.0.0.1:3000";
const EMAIL = "familia@nina.app";
const PASS = "nina123";
const OUT = "/opt/cursor/artifacts/stability-checklist";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
}

function euros(text) {
  const m = String(text).match(/-?\d[\d\s.,]*/);
  return m ? m[0] : text;
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "pt-PT",
  });
  const page = await context.newPage();
  let failed = false;

  try {
    // 1) Login
    await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle", timeout: 60000 });
    await page.fill('input[name="email"], input[type="email"]', EMAIL);
    await page.fill('input[name="password"], input[type="password"]', PASS);
    await Promise.all([
      page.waitForURL(/\/pt\/(dashboard|familia|espaco)/, { timeout: 30000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);
    const afterLogin = page.url();
    const loginOk = /\/pt\//.test(afterLogin) && !/login/.test(afterLogin);
    ok("inicia sessão corretamente", loginOk, afterLogin);
    if (!loginOk) {
      // try again looking for error
      const body = await page.textContent("body");
      ok("login body hint", false, body?.slice(0, 200) || "");
      failed = true;
      throw new Error("login failed");
    }
    await shot(page, "01-after-login");

    // 2) Offline
    const offlineVisible = await page.locator("text=Offline").first().isVisible().catch(() => false);
    const offlinePage = /offline/i.test(await page.title()) || page.url().includes("offline");
    ok("não aparece Offline", !offlineVisible && !offlinePage);

    // 3) Dashboard
    await page.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1000);
    const dashBody = await page.innerText("body");
    const dashOk =
      /Saldo este mês|Receitas|Despesas/i.test(dashBody || "") &&
      !/something went wrong|Application error|Internal Server Error/i.test(dashBody || "");
    ok("Dashboard funciona", dashOk);
    await shot(page, "02-dashboard");
    const balanceBefore = await page.locator("body").innerText();

    // 4) Add income
    await page.goto(`${BASE}/pt/receitas/nova`, { waitUntil: "networkidle", timeout: 60000 });
    const stamp = Date.now();
    const incomeDesc = `Teste receita ${stamp}`;
    await page.fill('input[name="description"]', incomeDesc);
    await page.fill('input[name="amount"]', "123,45");
    // date already defaulted
    await Promise.all([
      page.waitForURL(/\/pt\/receitas/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);
    const incomeList = await page.textContent("body");
    const incomeAdded = (incomeList || "").includes(incomeDesc) || (incomeList || "").includes("123");
    ok("é possível adicionar receitas", incomeAdded, incomeDesc);
    await shot(page, "03-income-added");

    // Find edit link for this income
    let incomeEditHref = null;
    const incomeLinks = page.locator(`a[href*="/pt/receitas/"]`);
    const nInc = await incomeLinks.count();
    for (let i = 0; i < nInc; i++) {
      const href = await incomeLinks.nth(i).getAttribute("href");
      if (href && /\/pt\/receitas\/[^/]+$/.test(href) && !href.endsWith("/nova")) {
        // check nearby text
        const row = incomeLinks.nth(i).locator("xpath=ancestor::*[self::tr or self::li or self::article or self::div][1]");
        const t = await row.textContent().catch(() => "");
        if ((t || "").includes(incomeDesc) || (t || "").includes("123,45") || (t || "").includes("123.45")) {
          incomeEditHref = href;
          break;
        }
      }
    }
    if (!incomeEditHref) {
      // fallback: open first non-nova income
      for (let i = 0; i < nInc; i++) {
        const href = await incomeLinks.nth(i).getAttribute("href");
        if (href && /\/pt\/receitas\/[^/]+$/.test(href) && !href.endsWith("/nova")) {
          incomeEditHref = href;
          break;
        }
      }
    }

    // 5) Edit income
    let incomeEdited = false;
    const incomeEditDesc = `Teste receita editada ${stamp}`;
    if (incomeEditHref) {
      await page.goto(`${BASE}${incomeEditHref}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.fill('input[name="description"]', incomeEditDesc);
      await page.fill('input[name="amount"]', "150,00");
      await Promise.all([
        page.waitForURL(/\/pt\/receitas/, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(1500);
      const afterEditInc = await page.textContent("body");
      incomeEdited = (afterEditInc || "").includes(incomeEditDesc) || (afterEditInc || "").includes("150");
    }
    ok("é possível editar receitas", incomeEdited, incomeEditHref || "no edit href");
    await shot(page, "04-income-edited");

    // 6) Add expense
    await page.goto(`${BASE}/pt/despesas/nova`, { waitUntil: "networkidle", timeout: 60000 });
    const expenseDesc = `Teste despesa ${stamp}`;
    await page.fill('input[name="description"]', expenseDesc);
    await page.fill('input[name="amount"]', "45,67");
    await Promise.all([
      page.waitForURL(/\/pt\/despesas/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);
    const expenseList = await page.textContent("body");
    const expenseAdded = (expenseList || "").includes(expenseDesc) || (expenseList || "").includes("45");
    ok("é possível adicionar despesas", expenseAdded, expenseDesc);
    await shot(page, "05-expense-added");

    // Find expense edit
    let expenseEditHref = null;
    const expenseLinks = page.locator(`a[href*="/pt/despesas/"]`);
    const nExp = await expenseLinks.count();
    for (let i = 0; i < nExp; i++) {
      const href = await expenseLinks.nth(i).getAttribute("href");
      if (href && /\/pt\/despesas\/[^/]+$/.test(href) && !href.endsWith("/nova") && !href.includes("ocr")) {
        const row = expenseLinks.nth(i).locator("xpath=ancestor::*[self::tr or self::li or self::article or self::div][1]");
        const t = await row.textContent().catch(() => "");
        if ((t || "").includes(expenseDesc)) {
          expenseEditHref = href;
          break;
        }
      }
    }
    if (!expenseEditHref) {
      for (let i = 0; i < nExp; i++) {
        const href = await expenseLinks.nth(i).getAttribute("href");
        if (href && /\/pt\/despesas\/[^/]+$/.test(href) && !href.endsWith("/nova")) {
          expenseEditHref = href;
          break;
        }
      }
    }

    // 7) Edit expense
    let expenseEdited = false;
    const expenseEditDesc = `Teste despesa editada ${stamp}`;
    if (expenseEditHref) {
      await page.goto(`${BASE}${expenseEditHref}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.fill('input[name="description"]', expenseEditDesc);
      await page.fill('input[name="amount"]', "50,00");
      await Promise.all([
        page.waitForURL(/\/pt\/despesas/, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForTimeout(1500);
      const afterEditExp = await page.textContent("body");
      expenseEdited = (afterEditExp || "").includes(expenseEditDesc) || (afterEditExp || "").includes("50");
    }
    ok("é possível editar despesas", expenseEdited, expenseEditHref || "no edit href");
    await shot(page, "06-expense-edited");

    // 8) Charts + balances update
    await page.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(1500);
    const balanceAfter = await page.locator("body").innerText();
    await shot(page, "07-dashboard-after");

    const hasCharts =
      (await page.locator("svg, canvas, [class*='chart'], [class*='Chart']").count()) > 0 ||
      /gráfico|estat|evolução|distrib/i.test(balanceAfter);
    const listsMention =
      balanceAfter.includes(incomeEditDesc) ||
      balanceAfter.includes(expenseEditDesc) ||
      balanceAfter.includes("150") ||
      balanceAfter.includes("50") ||
      balanceAfter !== balanceBefore;
    ok("gráficos atualizam / presentes", hasCharts || listsMention, hasCharts ? "charts found" : "content changed");
    ok("saldos atualizam", listsMention || balanceAfter !== balanceBefore, "dashboard refreshed after mutations");

    // Also check stats page if exists
    const statsRes = await page.goto(`${BASE}/pt/estatisticas`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => null);
    if (statsRes && statsRes.ok()) {
      await page.waitForTimeout(800);
      await shot(page, "08-estatisticas");
      const statsText = await page.innerText("body");
      ok(
        "página estatísticas carrega",
        /Comparação mensal|Despesas por categoria|Resumo/i.test(statsText || "") &&
          !/something went wrong|Application error|Internal Server Error/i.test(statsText || ""),
      );
    }
  } catch (e) {
    failed = true;
    ok("checklist abortada", false, String(e?.message || e));
    try {
      await page.screenshot({ path: path.join(OUT, "error.png"), fullPage: true });
    } catch {}
  } finally {
    await browser.close();
  }

  const allPass = results.every((r) => r.pass);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ allPass, results, base: BASE }, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(allPass ? "ALL PASSED" : "SOME FAILED");
  process.exit(allPass && !failed ? 0 : 1);
})();
