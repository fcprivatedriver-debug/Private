#!/usr/bin/env node
/**
 * Capture PR visual proof: screenshots of key screens + flow video/GIF.
 *
 * Usage:
 *   node scripts/pr-visual-proof.mjs --pr 8 [--base http://127.0.0.1:3000]
 *
 * Requires: app on :3000, demo seed loaded, playwright installed.
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

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function login(page, email) {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "movio123");
  await Promise.all([
    page.waitForURL(/\/pt\//, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", file);
  return file;
}

async function gotoShot(page, urlPath, name) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  return shot(page, name);
}

async function openFirstMatching(page, needle) {
  const links = page.locator("a.list-item");
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const text = await links.nth(i).innerText();
    if (text.includes(needle)) {
      await links.nth(i).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(400);
      return true;
    }
  }
  if (count > 0) {
    await links.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function captureStills() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await gotoShot(page, "/pt", "00-marketing-home");
  await gotoShot(page, "/pt/login", "01-login-demo-banner");
  await gotoShot(page, "/pt/registo", "02-register");
  await gotoShot(page, "/pt/como-funciona", "03-how-it-works");
  await gotoShot(page, "/pt/para-motoristas", "04-for-drivers");

  // Customer
  await login(page, "cliente@movio.app");
  await shot(page, "10-customer-pedidos");
  await gotoShot(page, "/pt/pedidos/novo", "11-customer-new-trip");
  await gotoShot(page, "/pt/pedidos", "12-customer-pedidos-again");
  await openFirstMatching(page, "Praça");
  await shot(page, "13-customer-trip-offers");
  await gotoShot(page, "/pt/pedidos", "14-customer-list");
  await openFirstMatching(page, "Sintra");
  await shot(page, "15-customer-confirmed");
  await gotoShot(page, "/pt", "16-customer-home");

  // Driver (fresh context)
  await browser.close();
  const browser2 = await chromium.launch({ headless: true });
  const page2 = await browser2.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page2, "motorista@movio.app");
  await shot(page2, "20-driver-painel");
  await gotoShot(page2, "/pt/pedidos-abertos", "21-driver-open-requests");
  await gotoShot(page2, "/pt/propostas", "22-driver-offers");
  await gotoShot(page2, "/pt/viagens", "23-driver-trips");
  await gotoShot(page2, "/pt/veiculo", "24-driver-vehicle");
  await gotoShot(page2, "/pt/onboarding", "25-driver-onboarding");

  await browser2.close();
  const browser3 = await chromium.launch({ headless: true });
  const page3 = await browser3.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page3, "admin@movio.app");
  await shot(page3, "30-admin-home");
  await gotoShot(page3, "/pt/admin/verificacoes", "31-admin-verifications");
  await gotoShot(page3, "/pt/admin/vehicle-classes", "32-admin-vehicle-classes");
  await gotoShot(page3, "/pt/admin", "33-admin-home-again");
  const adminLinks = page3.locator("a.list-item");
  if ((await adminLinks.count()) > 0) {
    await adminLinks.first().click();
    await page3.waitForLoadState("networkidle");
    await page3.waitForTimeout(400);
    await shot(page3, "34-admin-trip-detail");
  }

  await browser3.close();
}

async function captureFlowVideo() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "cliente@movio.app");
  await page.fill("#password", "movio123");
  await Promise.all([
    page.waitForURL(/\/pt\/pedidos/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
  await openFirstMatching(page, "Praça");
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/pt/pedidos/novo`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Switch to driver via logout + login
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  // clear session by visiting logout isn't easy; use new context for driver portion
  await context.close();
  const videoCustomer = fs.readdirSync(VIDEO_DIR).map((f) => path.join(VIDEO_DIR, f));

  const context2 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page2 = await context2.newPage();
  await login(page2, "motorista@movio.app");
  await page2.waitForTimeout(800);
  await page2.goto(`${BASE}/pt/pedidos-abertos`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(1000);
  await page2.goto(`${BASE}/pt/viagens`, { waitUntil: "networkidle" });
  await page2.waitForTimeout(1000);
  await context2.close();

  const context3 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page3 = await context3.newPage();
  await login(page3, "admin@movio.app");
  await page3.waitForTimeout(800);
  await page3.goto(`${BASE}/pt/admin/verificacoes`, { waitUntil: "networkidle" });
  await page3.waitForTimeout(1200);
  await context3.close();
  await browser.close();

  const clips = fs
    .readdirSync(VIDEO_DIR)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => path.join(VIDEO_DIR, f))
    .sort();

  if (clips.length === 0) {
    console.warn("No video clips recorded");
    return;
  }

  // Concat clips into one webm, then make GIF
  const listFile = path.join(VIDEO_DIR, "concat.txt");
  fs.writeFileSync(listFile, clips.map((c) => `file '${c}'`).join("\n"));
  const concat = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", WEBM],
    { encoding: "utf8" },
  );
  if (concat.status !== 0) {
    // fallback: copy first clip
    fs.copyFileSync(clips[0], WEBM);
    console.warn("concat failed, using first clip", concat.stderr?.slice(0, 400));
  }

  const gif = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      WEBM,
      "-vf",
      "fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer",
      "-loop",
      "0",
      GIF,
    ],
    { encoding: "utf8" },
  );
  if (gif.status !== 0) {
    console.error("gif failed", gif.stderr?.slice(-500));
  } else {
    console.log("gif", GIF);
  }
  console.log("video", WEBM);
  console.log("clips", clips.length, videoCustomer.length);
}

async function main() {
  console.log(`PR visual proof for #${PR} @ ${BASE}`);
  await captureStills();
  await captureFlowVideo();
  const shots = fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).sort();
  console.log(JSON.stringify({ pr: PR, shots: shots.length, out: OUT, gif: GIF, webm: WEBM }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
