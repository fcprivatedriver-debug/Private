#!/usr/bin/env node
/**
 * Capture PR visual proof for Nina.
 * Usage: node scripts/pr-visual-proof.mjs --pr N [--base http://127.0.0.1:3000]
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const PR = arg("pr", "0");
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = `/opt/cursor/artifacts/screenshots/pr-${PR}`;
const VIDEO_DIR = `/opt/cursor/artifacts/pr-${PR}-video`;
const GIF = `/opt/cursor/artifacts/pr-${PR}-flow.gif`;
const WEBM = `/opt/cursor/artifacts/pr-${PR}-flow.webm`;
const REPO_PROOF = path.join(process.cwd(), `docs/pr-proof/pr-${PR}`);

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPO_PROOF, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function login(page) {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill("familia@nina.app");
  await page.locator('input[name="password"]').fill("nina123");
  await Promise.all([
    page.waitForURL(/\/pt\/dashboard/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(600);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", file);
  return file;
}

async function gotoShot(page, urlPath, name) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(450);
  return shot(page, name);
}

async function captureStills() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await gotoShot(page, "/pt", "00-landing");
  await gotoShot(page, "/pt/login", "01-login");
  await gotoShot(page, "/pt/registo", "02-registo");

  await login(page);
  await shot(page, "10-dashboard");
  await gotoShot(page, "/pt/captura", "10h-captura");
  await page.getByRole("button", { name: /Supermercado, 35 euros/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await shot(page, "10i-captura-registado");
  await page.getByRole("button", { name: /Fotografar/i }).first().click().catch(() => {});
  await page.waitForTimeout(400);
  await shot(page, "10j-captura-foto");
  await page.getByRole("button", { name: /Continente para casa/i }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  await shot(page, "10b-nina-chat");
  await page.getByRole("button", { name: /Café/i }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await gotoShot(page, "/pt/familia", "10c-conta-familiar");
  await gotoShot(page, "/pt/ligacoes", "10g-ligacoes");
  await gotoShot(page, "/pt/memoria", "10d-memoria");
  await gotoShot(page, "/pt/perfil", "10e-perfil");
  await gotoShot(page, "/pt/convite/nina-demo-invite-token-seguro", "10f-convite");
  await gotoShot(page, "/pt/receitas", "11-receitas");
  await gotoShot(page, "/pt/despesas", "12-despesas");
  await gotoShot(page, "/pt/despesas/nova", "13-despesa-nova");
  await gotoShot(page, "/pt/orcamentos", "14-orcamentos");
  await gotoShot(page, "/pt/objetivos", "15-objetivos");
  await gotoShot(page, "/pt/estatisticas", "16-estatisticas");
  await gotoShot(page, "/pt/pesquisa?q=Continente", "17-pesquisa");
  await gotoShot(page, "/pt/recorrentes", "18-recorrentes");
  await gotoShot(page, "/pt/importacoes", "19-importacoes");
  await gotoShot(page, "/pt/ocr", "20-ocr");
  await gotoShot(page, "/pt/ia", "21-ia");
  await gotoShot(page, "/pt/familia", "22-familia");
  await gotoShot(page, "/pt/alertas", "23-alertas");
  await gotoShot(page, "/pt/definicoes", "24-definicoes");

  // Mobile stills
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoShot(page, "/pt/dashboard", "30-mobile-dashboard");
  await gotoShot(page, "/pt/despesas", "31-mobile-despesas");
  await gotoShot(page, "/pt/familia", "32-mobile-familia");
  await browser.close();
}

async function captureFlowVideo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="email"]').fill("familia@nina.app");
  await page.locator('input[name="password"]').fill("nina123");
  await Promise.all([
    page.waitForURL(/\/pt\/dashboard/, { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/pt/captura`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Supermercado, 35 euros/i }).first().click().catch(() => {});
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: /Conta Familiar/i }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/pt/familia`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/ligacoes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/memoria`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.goto(`${BASE}/pt/despesas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.goto(`${BASE}/pt/objetivos`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.goto(`${BASE}/pt/estatisticas`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.goto(`${BASE}/pt/ia`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await context.close();
  await browser.close();

  const videos = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (videos[0]) {
    fs.copyFileSync(path.join(VIDEO_DIR, videos[0]), WEBM);
    console.log("webm", WEBM);
    const ff = spawnSync(
      "ffmpeg",
      ["-y", "-i", WEBM, "-vf", "fps=10,scale=390:-1:flags=lanczos", "-loop", "0", GIF],
      { encoding: "utf8" },
    );
    if (ff.status === 0) console.log("gif", GIF);
    else console.warn("gif skipped", ff.stderr?.slice(0, 200));
  }
}

function publishRepoCopies() {
  const phoneDir = path.join(REPO_PROOF, "screenshots-phone");
  fs.mkdirSync(phoneDir, { recursive: true });
  for (const file of fs.readdirSync(OUT)) {
    if (!file.endsWith(".png")) continue;
    fs.copyFileSync(path.join(OUT, file), path.join(REPO_PROOF, file));
    // jpeg-ish copy for phone folder (png is fine for proof)
    fs.copyFileSync(path.join(OUT, file), path.join(phoneDir, file.replace(".png", ".jpg")));
  }
  if (fs.existsSync(GIF)) fs.copyFileSync(GIF, path.join(REPO_PROOF, "flow-phone.gif"));
  if (fs.existsSync(WEBM)) fs.copyFileSync(WEBM, path.join(REPO_PROOF, "flow-phone.webm"));

  const changelog = path.join(process.cwd(), `docs/changelogs/pr-${PR}.md`);
  if (fs.existsSync(changelog)) {
    fs.copyFileSync(changelog, path.join(REPO_PROOF, "CHANGELOG.md"));
  }
  fs.writeFileSync(
    path.join(REPO_PROOF, "README.md"),
    `# Nina PR ${PR} visual proof\n\nScreenshots and flow capture for review.\n`,
  );
  console.log("published", REPO_PROOF);
}

await captureStills();
await captureFlowVideo();
publishRepoCopies();
console.log("done");
