import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const BASE = "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/screenshots/pr-9";
const VIDEO_DIR = "/opt/cursor/artifacts/pr-9-video";
const WEBM = "/opt/cursor/artifacts/pr-9-flow.webm";
const GIF = "/opt/cursor/artifacts/pr-9-flow.gif";
const DRIVER = process.env.DRIVER_ID || "";
const VEHICLE = process.env.VEHICLE_ID || "";

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

async function login(page, email) {
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "movio123");
  await Promise.all([
    page.waitForURL(/\/pt\//, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(400);
}

async function shot(page, name) {
  const file = path.join(OUT, name + ".png");
  await page.screenshot({ path: file, fullPage: true });
  console.log(name);
}

async function gotoShot(page, url, name) {
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, name);
}

async function openMatch(page, needle) {
  const links = page.locator("a.list-item");
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const t = await links.nth(i).innerText();
    if (t.includes(needle)) {
      await links.nth(i).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);
      return true;
    }
  }
  if (n > 0) {
    await links.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

async function desktop() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await gotoShot(page, "/pt", "d-00-landing");
  await gotoShot(page, "/pt/como-funciona", "d-01-how");
  await gotoShot(page, "/pt/para-motoristas", "d-02-for-drivers");
  await gotoShot(page, "/pt/login", "d-03-login");
  await gotoShot(page, "/pt/registo", "d-04-register");

  await login(page, "cliente@movio.app");
  await shot(page, "d-10-customer-dashboard");
  await gotoShot(page, "/pt/pedidos/novo", "d-11-new-trip");
  await gotoShot(page, "/pt/pedidos", "d-12-customer-list");
  await openMatch(page, "Praça");
  await shot(page, "d-13-trip-map-offers");
  await gotoShot(page, "/pt/pedidos", "d-14-list");
  await openMatch(page, "Sintra");
  await shot(page, "d-15-confirmed");
  if (DRIVER) await gotoShot(page, "/pt/motoristas/" + DRIVER, "d-16-driver-profile");
  if (VEHICLE) await gotoShot(page, "/pt/veiculos/" + VEHICLE, "d-17-vehicle-profile");

  await browser.close();

  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
  await login(p2, "motorista@movio.app");
  await shot(p2, "d-20-driver-dashboard");
  await gotoShot(p2, "/pt/pedidos-abertos", "d-21-open-requests");
  await gotoShot(p2, "/pt/propostas", "d-22-offers");
  await gotoShot(p2, "/pt/viagens", "d-23-trips");
  await gotoShot(p2, "/pt/veiculo", "d-24-vehicle-manage");
  await b2.close();

  const b3 = await chromium.launch({ headless: true });
  const p3 = await b3.newPage({ viewport: { width: 1440, height: 900 } });
  await login(p3, "admin@movio.app");
  await shot(p3, "d-30-admin");
  await gotoShot(p3, "/pt/admin/verificacoes", "d-31-verifications");
  await gotoShot(p3, "/pt/admin/vehicle-classes", "d-32-classes");
  await b3.close();
}

async function mobile() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await gotoShot(page, "/pt", "m-00-landing");
  await gotoShot(page, "/pt/login", "m-01-login");
  await login(page, "cliente@movio.app");
  await shot(page, "m-10-customer-dashboard");
  await gotoShot(page, "/pt/pedidos/novo", "m-11-new-trip");
  await gotoShot(page, "/pt/pedidos", "m-12-list");
  await openMatch(page, "Praça");
  await shot(page, "m-13-trip-detail");
  await browser.close();

  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(p2, "motorista@movio.app");
  await shot(p2, "m-20-driver-dashboard");
  await gotoShot(p2, "/pt/pedidos-abertos", "m-21-open");
  await b2.close();

  const b3 = await chromium.launch({ headless: true });
  const p3 = await b3.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await login(p3, "admin@movio.app");
  await shot(p3, "m-30-admin");
  await b3.close();
}

async function video() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/pt", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.goto(BASE + "/pt/login", { waitUntil: "networkidle" });
  await page.fill("#email", "cliente@movio.app");
  await page.fill("#password", "movio123");
  await Promise.all([page.waitForURL(/\/pt\/pedidos/), page.click('button[type="submit"]')]);
  await page.waitForTimeout(1000);
  await openMatch(page, "Praça");
  await page.waitForTimeout(2000);
  await page.goto(BASE + "/pt/pedidos/novo", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await ctx.close();

  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const p2 = await ctx2.newPage();
  await login(p2, "motorista@movio.app");
  await p2.waitForTimeout(900);
  await p2.goto(BASE + "/pt/pedidos-abertos", { waitUntil: "networkidle" });
  await p2.waitForTimeout(1000);
  if (DRIVER) {
    await p2.goto(BASE + "/pt/motoristas/" + DRIVER, { waitUntil: "networkidle" });
    await p2.waitForTimeout(1000);
  }
  await ctx2.close();

  const ctx3 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const p3 = await ctx3.newPage();
  await login(p3, "admin@movio.app");
  await p3.waitForTimeout(900);
  await p3.goto(BASE + "/pt/admin/verificacoes", { waitUntil: "networkidle" });
  await p3.waitForTimeout(1200);
  await ctx3.close();
  await browser.close();

  const clips = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm")).map((f) => path.join(VIDEO_DIR, f)).sort();
  const list = path.join(VIDEO_DIR, "concat.txt");
  fs.writeFileSync(list, clips.map((c) => "file '" + c + "'").join("\n"));
  spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", WEBM], { encoding: "utf8" });
  spawnSync("ffmpeg", ["-y", "-i", WEBM, "-vf", "fps=6,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=40[p];[s1][p]paletteuse", "-loop", "0", GIF], { encoding: "utf8" });
  console.log("video", WEBM, "gif", GIF, "clips", clips.length);
}

await desktop();
await mobile();
await video();
console.log("shots", fs.readdirSync(OUT).length);
