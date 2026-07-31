#!/usr/bin/env node
/**
 * Capture PR visual proof for FC Private Driver.
 * Usage: node scripts/pr-visual-proof.mjs --pr <N> [--base http://127.0.0.1:3000]
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
const PASSWORD = "fcpd1234";

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function login(page, email) {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([
    page.waitForURL(/\/pt\//, { timeout: 25000 }),
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
  await page.waitForTimeout(500);
  return shot(page, name);
}

async function captureStills() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  // Public
  await gotoShot(desktop, "/pt", "d-00-landing");
  await gotoShot(phone, "/pt", "m-00-landing");
  await gotoShot(desktop, "/pt/planos", "d-01-planos");
  await gotoShot(phone, "/pt/planos", "m-01-planos");
  await gotoShot(desktop, "/pt/planos/diamante", "d-01b-diamante-form");
  await gotoShot(phone, "/pt/planos/diamante", "m-01b-diamante-form");
  await gotoShot(desktop, "/pt/login", "d-02-login");
  await gotoShot(desktop, "/pt/registo", "d-03-registo");
  await gotoShot(desktop, "/pt/contacto", "d-04-contacto");

  // Customer
  await login(desktop, "cliente@fcprivatedriver.demo");
  await gotoShot(desktop, "/pt/cliente", "d-10-cliente");
  await gotoShot(phone, "/pt/cliente", "m-10-cliente");
  await gotoShot(desktop, "/pt/cliente/viagem/nova", "d-11-nova-viagem");
  await gotoShot(desktop, "/pt/minutos", "d-12-minutos");
  await gotoShot(desktop, "/pt/faturas", "d-13-faturas");
  await gotoShot(desktop, "/pt/perfil", "d-14-perfil");
  await gotoShot(desktop, "/pt/habitos", "d-15-habitos");
  await desktop.goto(`${BASE}/pt/login`); // clear via logout not available — new context
  await browser.close();

  const browser2 = await chromium.launch({ headless: true });
  const page = await browser2.newPage({ viewport: { width: 1440, height: 900 } });

  // Driver
  await login(page, "motorista@fcprivatedriver.demo");
  

  // Admin
  await page.context().clearCookies();
  await login(page, "admin@fcprivatedriver.demo");
  await gotoShot(page, "/pt/admin", "d-30-admin");
  await gotoShot(page, "/pt/admin/diamante", "d-30b-clientes-diamante");
  await gotoShot(page, "/pt/admin/clientes", "d-31-clientes");
  await gotoShot(page, "/pt/admin/planos", "d-32-planos");
  await gotoShot(page, "/pt/admin/viagens", "d-33-viagens");
  
  await gotoShot(page, "/pt/admin/pagamentos", "d-35-pagamentos");
  await gotoShot(page, "/pt/admin/configuracoes", "d-36-config");

  await browser2.close();
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
  await page.goto(`${BASE}/pt/planos`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await login(page, "cliente@fcprivatedriver.demo");
  await page.goto(`${BASE}/pt/cliente`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.goto(`${BASE}/pt/cliente/viagem/nova`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await page.goto(`${BASE}/pt/minutos`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);

  await context.close();
  await browser.close();

  const videos = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (videos[0]) {
    fs.copyFileSync(path.join(VIDEO_DIR, videos[0]), WEBM);
    console.log("video", WEBM);
    const ff = spawnSync(
      "ffmpeg",
      ["-y", "-i", WEBM, "-vf", "fps=8,scale=390:-1:flags=lanczos", "-loop", "0", GIF],
      { encoding: "utf8" },
    );
    if (ff.status === 0) console.log("gif", GIF);
    else console.warn("ffmpeg gif skipped", ff.stderr?.slice(0, 200));
  }
}

async function publishToRepo() {
  const repoDir = path.join(process.cwd(), "docs", "pr-proof", `pr-${PR}`);
  const shotsDir = path.join(repoDir, "screenshots-phone");
  fs.mkdirSync(shotsDir, { recursive: true });

  for (const file of fs.readdirSync(OUT)) {
    if (!file.endsWith(".png")) continue;
    const src = path.join(OUT, file);
    const dest = path.join(shotsDir, file.replace(/\.png$/, ".jpg"));
    spawnSync("convert", [src, "-quality", "82", dest], { encoding: "utf8" });
  }
  if (fs.existsSync(GIF)) fs.copyFileSync(GIF, path.join(repoDir, "flow-phone.gif"));
  if (fs.existsSync(WEBM)) fs.copyFileSync(WEBM, path.join(repoDir, "flow.webm"));

  // Changelog is maintained in docs/changelogs/pr-<N>.md — do not overwrite here.
  console.log("published", repoDir);
}

await captureStills();
await captureFlowVideo();
await publishToRepo();
console.log("done");
