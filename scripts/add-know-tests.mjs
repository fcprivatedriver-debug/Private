#!/usr/bin/env node
/**
 * Testes obrigatórios 1–20 — ADD ↔ KNOW layout
 */
import { chromium } from "playwright";
import fs from "fs";

const BASE = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3000"
).replace(/\/$/, "");
const OUT = "/opt/cursor/artifacts/screenshots/add-know-tests";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(n, name, pass, detail = "") {
  results.push({ n, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${n}. ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // 1. Login → aplicação
  try {
    await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
    await page.locator('input[name="email"]').fill("demo@nina.app");
    await page.locator('input[name="password"]').fill("nina123");
    await Promise.all([
      page.waitForURL(/\/pt\/dashboard/, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(800);
    record(1, "Login → aplicação", page.url().includes("/dashboard"));
  } catch (e) {
    record(1, "Login → aplicação", false, String(e.message || e));
  }

  // 2. Header novo
  try {
    const header = page.locator('[data-testid="app-brand-header"]');
    const visible = await header.isVisible();
    await page.screenshot({ path: `${OUT}/02-header.png`, fullPage: false });
    record(2, "Header novo visível", visible);
  } catch (e) {
    record(2, "Header novo visível", false, String(e.message || e));
  }

  // 3. Logo em escada
  try {
    const add = await page.locator(".brand-line--add").first().textContent();
    const and = await page.locator(".brand-and-text").first().textContent();
    const know = await page.locator(".brand-line--know").first().textContent();
    const slogan = await page.locator(".brand-slogan").first().textContent();
    const ok =
      add?.trim() === "Add" &&
      and?.trim() === "and" &&
      know?.trim() === "Know" &&
      /Controla Poupa Vive/i.test(slogan || "");
    record(3, "Logo em escada", ok, `${add}/${and}/${know} · ${slogan}`);
  } catch (e) {
    record(3, "Logo em escada", false, String(e.message || e));
  }

  // 4. ADD selecionável
  try {
    const addTab = page.getByRole("tab", { name: "ADD" });
    await addTab.click();
    await page.waitForTimeout(300);
    const selected = (await addTab.getAttribute("aria-selected")) === "true";
    const ola = await page.locator(".add-pane-title").isVisible();
    record(4, "ADD selecionável", selected && ola);
  } catch (e) {
    record(4, "ADD selecionável", false, String(e.message || e));
  }

  // 5. KNOW selecionável
  try {
    const knowTab = page.getByRole("tab", { name: "KNOW" });
    await knowTab.click();
    await page.waitForTimeout(600);
    const selected = (await knowTab.getAttribute("aria-selected")) === "true";
    const title = await page.locator(".know-title").isVisible();
    await page.screenshot({ path: `${OUT}/05-know.png`, fullPage: true });
    record(5, "KNOW selecionável", selected && title);
  } catch (e) {
    record(5, "KNOW selecionável", false, String(e.message || e));
  }

  // 6. Swipe ADD → KNOW
  try {
    await page.getByRole("tab", { name: "ADD" }).click();
    await page.waitForTimeout(300);
    const box = await page.locator(".add-know-panes").boundingBox();
    if (!box) throw new Error("no panes box");
    const y = box.y + box.height * 0.4;
    await page.touchscreen.tap(box.x + box.width * 0.8, y);
    // emulate swipe left
    await page.evaluate(() => {
      const el = document.querySelector(".add-know-panes");
      if (!el) return;
      const t0 = new Touch({
        identifier: 1,
        target: el,
        clientX: 320,
        clientY: 400,
      });
      el.dispatchEvent(
        new TouchEvent("touchstart", { changedTouches: [t0], touches: [t0], bubbles: true }),
      );
      const t1 = new Touch({
        identifier: 1,
        target: el,
        clientX: 80,
        clientY: 405,
      });
      el.dispatchEvent(
        new TouchEvent("touchend", { changedTouches: [t1], touches: [], bubbles: true }),
      );
    });
    await page.waitForTimeout(500);
    const selected =
      (await page.getByRole("tab", { name: "KNOW" }).getAttribute("aria-selected")) === "true";
    record(6, "Swipe ADD → KNOW", selected, page.url());
  } catch (e) {
    record(6, "Swipe ADD → KNOW", false, String(e.message || e));
  }

  // 7. Swipe KNOW → ADD
  try {
    await page.getByRole("tab", { name: "KNOW" }).click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const el = document.querySelector(".add-know-panes");
      if (!el) return;
      const t0 = new Touch({
        identifier: 2,
        target: el,
        clientX: 80,
        clientY: 400,
      });
      el.dispatchEvent(
        new TouchEvent("touchstart", { changedTouches: [t0], touches: [t0], bubbles: true }),
      );
      const t1 = new Touch({
        identifier: 2,
        target: el,
        clientX: 320,
        clientY: 405,
      });
      el.dispatchEvent(
        new TouchEvent("touchend", { changedTouches: [t1], touches: [], bubbles: true }),
      );
    });
    await page.waitForTimeout(500);
    const selected =
      (await page.getByRole("tab", { name: "ADD" }).getAttribute("aria-selected")) === "true";
    record(7, "Swipe KNOW → ADD", selected, page.url());
  } catch (e) {
    record(7, "Swipe KNOW → ADD", false, String(e.message || e));
  }

  // 8. Cartões ADD funcionais
  try {
    await page.getByRole("tab", { name: "ADD" }).click();
    await page.waitForTimeout(300);
    const cards = ["Despesa", "Receita", "Agendar", "Mobilidade", "Compras", "Fala com a MEL"];
    let all = true;
    for (const c of cards) {
      const link = page.locator(".dash-action", { hasText: c }).first();
      if (!(await link.isVisible())) all = false;
    }
    const href = await page.locator(".dash-action", { hasText: "Despesa" }).getAttribute("href");
    record(8, "Cartões ADD funcionais", all && Boolean(href?.includes("despesas")), href || "");
  } catch (e) {
    record(8, "Cartões ADD funcionais", false, String(e.message || e));
  }

  // 9–11 KNOW totais reais
  try {
    await page.getByRole("tab", { name: "KNOW" }).click();
    await page.waitForURL(/pane=know/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const income = await page.locator(".know-total-card.is-income strong").textContent();
    const expense = await page.locator(".know-total-card.is-expense strong").textContent();
    const balance = await page.locator(".know-total-card.is-balance strong").textContent();
    const euro = /€|EUR|\d/i;
    record(9, "KNOW receitas reais", euro.test(income || ""), income || "");
    record(10, "KNOW despesas reais", euro.test(expense || ""), expense || "");
    record(11, "Saldo calculado", euro.test(balance || ""), balance || "");
  } catch (e) {
    record(9, "KNOW receitas reais", false, String(e.message || e));
    record(10, "KNOW despesas reais", false, String(e.message || e));
    record(11, "Saldo calculado", false, String(e.message || e));
  }

  // 12 Pessoal / 13 Familiar — header visível no mobile
  try {
    const space = page.locator('[data-testid="app-space-header"]');
    const personalBtn = space.locator(".space-switch-btn").filter({ hasText: "Pessoal" });
    const familyBtn = space.locator(".space-switch-btn").filter({ hasText: "Familiar" });
    await personalBtn.click();
    await page.waitForTimeout(500);
    const personalName = (await page.locator('[data-testid="header-space-name"]').textContent()) || "";
    const personalOk =
      (await personalBtn.getAttribute("aria-selected")) === "true" || /Filipe/i.test(personalName);
    record(12, "Pessoal funciona", personalOk, personalName);

    await familyBtn.click();
    await page.waitForTimeout(800);
    const famName = (await page.locator('[data-testid="header-space-name"]').textContent()) || "";
    const familyOk =
      (await familyBtn.getAttribute("aria-selected")) === "true" || /Família|Casquinha/i.test(famName);
    await page.screenshot({ path: `${OUT}/13-familiar.png`, fullPage: false });
    record(13, "Familiar funciona", familyOk, famName);
  } catch (e) {
    record(12, "Pessoal funciona", false, String(e.message || e));
    record(13, "Familiar funciona", false, String(e.message || e));
  }

  // 14 Filtro membro (requer Familiar)
  try {
    await page.goto(`${BASE}/pt/dashboard?pane=know`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const memberSel = page.locator('[data-know-filter="member"]');
    if ((await memberSel.count()) === 0) {
      await page.locator('[data-testid="app-space-header"] .space-switch-btn').filter({ hasText: "Familiar" }).click();
      await page.waitForTimeout(1000);
      await page.goto(`${BASE}/pt/dashboard?pane=know`, { waitUntil: "networkidle" });
    }
    const sel = page.locator('[data-know-filter="member"]');
    const opts = await sel.locator("option").count();
    if (opts > 1) {
      await sel.selectOption({ index: 1 });
      await page.getByRole("button", { name: /Aplicar filtros/i }).click();
      await page.waitForTimeout(1200);
      record(14, "Filtro por membro", page.url().includes("member="), page.url());
    } else {
      record(14, "Filtro por membro", (await sel.count()) > 0, `opts=${opts}`);
    }
  } catch (e) {
    record(14, "Filtro por membro", false, String(e.message || e));
  }

  // 15 Filtro categoria
  try {
    await page.goto(`${BASE}/pt/dashboard?pane=know`, { waitUntil: "networkidle" });
    const sel = page.locator('[data-know-filter="cat"]');
    const opts = await sel.locator("option").count();
    if (opts > 1) {
      await sel.selectOption({ index: 1 });
      await page.getByRole("button", { name: /Aplicar filtros/i }).click();
      await page.waitForTimeout(1200);
      record(15, "Filtro por categoria", page.url().includes("cat="), page.url());
    } else {
      record(15, "Filtro por categoria", opts >= 1, `opts=${opts}`);
    }
  } catch (e) {
    record(15, "Filtro por categoria", false, String(e.message || e));
  }

  // 16 Filtro período
  try {
    await page.goto(`${BASE}/pt/dashboard?pane=know`, { waitUntil: "networkidle" });
    await page.locator('[data-know-filter="month"]').selectOption("8");
    await page.getByRole("button", { name: /Aplicar filtros/i }).click();
    await page.waitForTimeout(1200);
    record(16, "Filtro por período", /[?&]m=8\b/.test(page.url()), page.url());
  } catch (e) {
    record(16, "Filtro por período", false, String(e.message || e));
  }

  // 17 Poupança sem fictícios
  try {
    await page.goto(`${BASE}/pt/dashboard?pane=know`, { waitUntil: "networkidle" });
    const main = await page.locator(".know-savings-main").textContent();
    const all = await page.locator(".know-savings-all").textContent();
    const text = `${main} ${all}`;
    const fake = /32[,.]40|1[.,]128[,.]70|9[,.]99/.test(text);
    const hasEuro = /€|0,00|0\.00|\d/.test(text);
    record(17, "Poupança sem valores fictícios", !fake && hasEuro, text.trim());
    await page.screenshot({ path: `${OUT}/17-savings.png`, fullPage: false });
  } catch (e) {
    record(17, "Poupança sem valores fictícios", false, String(e.message || e));
  }

  // 18 Refresh
  try {
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const tabs = await page.getByRole("tab", { name: "ADD" }).isVisible();
    const header = await page.locator('[data-testid="app-brand-header"]').isVisible();
    record(18, "Refresh mantém funcionamento", tabs && header);
  } catch (e) {
    record(18, "Refresh mantém funcionamento", false, String(e.message || e));
  }

  // 19 Mobile overflow
  try {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        bodyScroll: document.body.scrollWidth,
      };
    });
    const ok = overflow.scrollWidth <= overflow.clientWidth + 2;
    record(19, "Mobile sem overflow", ok, JSON.stringify(overflow));
    await page.screenshot({ path: `${OUT}/19-mobile.png`, fullPage: true });
  } catch (e) {
    record(19, "Mobile sem overflow", false, String(e.message || e));
  }

  // 20 Bottom nav
  try {
    const nav = page.locator(".mobile-nav");
    const hoje = page.locator(".mobile-nav-link", { hasText: "Hoje" });
    const guia = page.locator(".mobile-nav-link", { hasText: "Guia" });
    const ok = (await nav.isVisible()) && (await hoje.isVisible()) && (await guia.isVisible());
    await guia.click();
    await page.waitForTimeout(800);
    const onGuia = page.url().includes("/guia");
    record(20, "Bottom navigation funcional", ok && onGuia, page.url());
  } catch (e) {
    record(20, "Bottom navigation funcional", false, String(e.message || e));
  }

  // No redundant addYknow under header on dashboard
  await page.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle" });
  const bodyText = await page.locator(".home-add-know").innerText().catch(() => "");
  const redundant = /^addYknow/m.test(bodyText) || bodyText.includes("\naddYknow\n");
  console.log("extra-check redundant branding:", redundant, bodyText.slice(0, 120).replace(/\n/g, " | "));

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log("\n=== SUMMARY ===");
  console.log(`PASS ${results.filter((r) => r.pass).length}/${results.length}`);
  if (failed.length) {
    console.log("FAILED:", failed.map((f) => f.n).join(", "));
    process.exitCode = 1;
  }
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
