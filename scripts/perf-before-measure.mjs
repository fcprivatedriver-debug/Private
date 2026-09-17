import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.PERF_BASE || 'http://localhost:3000';
const OUT = process.env.PERF_OUT || '/opt/cursor/artifacts/before';
const EMAIL = 'demo@nina.app';
const PASS = 'nina123';
const LABEL = process.env.PERF_LABEL || 'before';

fs.mkdirSync(OUT, { recursive: true });

async function measureNav(page, name, action) {
  const t0 = Date.now();
  await action();
  try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
  return { name, ms: Date.now() - t0 };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const results = [];

  const tLogin0 = Date.now();
  await page.goto(`${BASE}/pt/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"], input[name="password"]').first().fill(PASS);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 25000 });
  } catch {}
  results.push({ name: 'login', ms: Date.now() - tLogin0, url: page.url() });

  results.push(await measureNav(page, 'abertura_hoje', async () => {
    await page.goto(`${BASE}/pt/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.page-title, h1', { timeout: 15000 });
  }));
  await page.screenshot({ path: path.join(OUT, `hoje-${LABEL}.png`), fullPage: true });

  const spaceBtn = page.locator('.topbar-space-mobile .space-switch-btn, .space-switcher .space-switch-btn').filter({ hasText: /^Familiar$/i }).last();
  if (await spaceBtn.count()) {
    await spaceBtn.scrollIntoViewIfNeeded().catch(() => {});
    results.push(await measureNav(page, 'pessoal_para_familiar', async () => {
      await spaceBtn.click({ force: true });
      await page.waitForTimeout(1200);
    }));
    await page.screenshot({ path: path.join(OUT, `hoje-familiar-${LABEL}.png`), fullPage: true });
    const personalBtn = page.locator('.topbar-space-mobile .space-switch-btn, .space-switcher .space-switch-btn').filter({ hasText: /^Pessoal$/i }).last();
    if (await personalBtn.count()) {
      results.push(await measureNav(page, 'familiar_para_pessoal', async () => {
        await personalBtn.click({ force: true });
        await page.waitForTimeout(1200);
      }));
    }
  }

  // FAB click timing
  const fab = page.locator('a.captura-fab').first();
  if (await fab.count()) {
    results.push(await measureNav(page, 'tocar_fab_mais', async () => {
      await fab.click();
      await page.waitForURL(/captura/, { timeout: 15000 });
    }));
  }

  results.push(await measureNav(page, 'abrir_fab_captura', async () => {
    await page.goto(`${BASE}/pt/captura`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }));
  await page.screenshot({ path: path.join(OUT, `captura-${LABEL}.png`), fullPage: true });

  results.push(await measureNav(page, 'hoje_para_falar', async () => {
    await page.goto(`${BASE}/pt/captura?mode=voice&auto=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }));
  await page.screenshot({ path: path.join(OUT, `falar-${LABEL}.png`), fullPage: true });

  results.push(await measureNav(page, 'abrir_fatura', async () => {
    await page.goto(`${BASE}/pt/captura?mode=photo&auto=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }));
  await page.screenshot({ path: path.join(OUT, `fatura-${LABEL}.png`), fullPage: true });

  results.push(await measureNav(page, 'hoje_para_compras', async () => {
    await page.goto(`${BASE}/pt/lista`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }));
  await page.screenshot({ path: path.join(OUT, `compras-${LABEL}.png`), fullPage: true });

  results.push(await measureNav(page, 'hoje_para_nova_despesa', async () => {
    await page.goto(`${BASE}/pt/despesas/nova`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
  }));
  await page.screenshot({ path: path.join(OUT, `despesa-nova-${LABEL}.png`), fullPage: true });

  results.push(await measureNav(page, 'hoje_para_mais', async () => {
    await page.goto(`${BASE}/pt/definicoes`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
  }));
  await page.screenshot({ path: path.join(OUT, `mais-${LABEL}.png`), fullPage: true });

  // Server-side timing probe via Performance API for navigation
  const outFile = `/tmp/perf-${LABEL}/results.json`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log('RESULTS', JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
