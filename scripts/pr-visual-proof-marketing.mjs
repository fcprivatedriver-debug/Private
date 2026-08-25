#!/usr/bin/env node
/**
 * Visual proof for FC Private Driver marketing site.
 * Usage: node scripts/pr-visual-proof-marketing.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3000"
).replace(/\/$/, "");
const OUT = "/opt/cursor/artifacts/screenshots";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", file);
}

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const phone = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

for (const [page, prefix] of [
  [desktop, "d"],
  [phone, "m"],
]) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, `${prefix}-home`);

  await page.goto(`${BASE}/servicos`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot(page, `${prefix}-servicos`);

  await page.goto(`${BASE}/contactos?servico=jovens`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await shot(page, `${prefix}-contactos`);
}

await desktop.goto(`${BASE}/sobre`, { waitUntil: "networkidle" });
await shot(desktop, "d-sobre");
await desktop.goto(`${BASE}/privacidade`, { waitUntil: "networkidle" });
await shot(desktop, "d-privacidade");

await browser.close();
console.log("done");
