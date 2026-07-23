#!/usr/bin/env node
/**
 * PR #10 visual proof — full customer journey (desktop + mobile) + flow video/GIF.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { PrismaClient } from "@prisma/client";

const BASE = (process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://127.0.0.1:3000"
).replace(/\/$/, "");
const OUT = "/opt/cursor/artifacts/screenshots/pr-10";
const VIDEO_DIR = "/opt/cursor/artifacts/pr-10-video";
const WEBM = "/opt/cursor/artifacts/pr-10-flow.webm";
const GIF = "/opt/cursor/artifacts/pr-10-flow.gif";
const MOBILE_WEBM = "/opt/cursor/artifacts/pr-10-mobile-flow.webm";
const MOBILE_GIF = "/opt/cursor/artifacts/pr-10-mobile-flow.gif";

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const prisma = new PrismaClient();

async function ids() {
  const open = await prisma.tripRequest.findFirst({
    where: { status: "OPEN", offers: { some: {} } },
    include: { offers: true },
    orderBy: { createdAt: "asc" },
  });
  const confirmed = await prisma.tripRequest.findFirst({
    where: { status: "CONFIRMED" },
  });
  const progress = await prisma.tripRequest.findFirst({
    where: { status: "IN_PROGRESS" },
  });
  const completed = await prisma.tripRequest.findFirst({
    where: { status: "COMPLETED", booking: { review: { isNot: null } } },
  });
  const driver = await prisma.driverProfile.findFirst({
    where: { user: { email: "motorista@movio.app" } },
    include: { vehicles: true },
  });
  return {
    openId: open?.id,
    confirmedId: confirmed?.id,
    progressId: progress?.id,
    completedId: completed?.id,
    driverId: driver?.id,
    vehicleId: driver?.vehicles?.[0]?.id,
  };
}

async function login(page, email) {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "movio123");
  await Promise.all([
    page.waitForURL(/\/pt\//, { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("shot", name);
}

async function gotoShot(page, url, name) {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(550);
  await shot(page, name);
}

async function desktop(info) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await gotoShot(page, "/pt", "d-00-landing");
  await gotoShot(page, "/pt/como-funciona", "d-01-how");
  await gotoShot(page, "/pt/para-motoristas", "d-02-for-drivers");
  await gotoShot(page, "/pt/login", "d-03-login");
  await gotoShot(page, "/pt/registo", "d-04-register");

  await login(page, "cliente@movio.app");
  await shot(page, "d-10-customer-dashboard");
  await gotoShot(page, "/pt/pedidos/novo", "d-11-new-trip-form");

  // Fill route for estimate preview
  await page.fill('input[name="pickupAddress"], input#pickupAddress, input[placeholder*="partida" i], input[placeholder*="Pick" i]', "Aeroporto de Lisboa");
  // AddressAutocomplete uses controlled input without always exposing name on visible field — use labels
  const inputs = page.locator("form input.input");
  const count = await inputs.count();
  if (count >= 2) {
    await inputs.nth(0).fill("Aeroporto de Lisboa (LIS), Lisboa");
    await inputs.nth(1).fill("Praça do Comércio, Lisboa");
  }
  await page.waitForTimeout(2200);
  await shot(page, "d-12-new-trip-route-estimate");

  await gotoShot(page, "/pt/pedidos", "d-13-customer-list");
  if (info.openId) {
    await gotoShot(page, `/pt/pedidos/${info.openId}`, "d-14-offers-premium");
    // sort control
    const sort = page.locator("select").filter({ hasText: "Menor preço" }).first();
    if (await sort.count()) {
      await sort.selectOption("driverRating");
      await page.waitForTimeout(400);
      await shot(page, "d-15-offers-sorted-rating");
    }
  }

  if (info.confirmedId) {
    await gotoShot(page, `/pt/pedidos/${info.confirmedId}`, "d-16-journey-confirmed");
    await gotoShot(page, `/pt/pedidos/${info.confirmedId}/confirmacao`, "d-17-booking-confirmation");
  }
  if (info.progressId) {
    await gotoShot(page, `/pt/pedidos/${info.progressId}`, "d-18-journey-in-progress");
  }
  if (info.completedId) {
    await gotoShot(page, `/pt/pedidos/${info.completedId}`, "d-19-completed-reviewed");
  }
  if (info.driverId) await gotoShot(page, `/pt/motoristas/${info.driverId}`, "d-20-driver-profile");
  if (info.vehicleId) await gotoShot(page, `/pt/veiculos/${info.vehicleId}`, "d-21-vehicle-profile");

  await browser.close();

  // Driver
  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({ viewport: { width: 1440, height: 900 } });
  await login(p2, "motorista@movio.app");
  await shot(p2, "d-30-driver-dashboard");
  await gotoShot(p2, "/pt/pedidos-abertos", "d-31-open-requests");
  if (info.openId) {
    await gotoShot(p2, `/pt/pedidos/${info.openId}`, "d-32-driver-trip-offer-form");
  }
  await gotoShot(p2, "/pt/propostas", "d-33-driver-offers");
  await gotoShot(p2, "/pt/viagens", "d-34-driver-trips");
  await gotoShot(p2, "/pt/veiculo", "d-35-driver-vehicle");
  await b2.close();

  // Admin
  const b3 = await chromium.launch({ headless: true });
  const p3 = await b3.newPage({ viewport: { width: 1440, height: 900 } });
  await login(p3, "admin@movio.app");
  await shot(p3, "d-40-admin");
  await gotoShot(p3, "/pt/admin/verificacoes", "d-41-verifications");
  await gotoShot(p3, "/pt/admin/vehicle-classes", "d-42-classes");
  await b3.close();
}

async function mobile(info) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await gotoShot(page, "/pt", "m-00-landing");
  await gotoShot(page, "/pt/como-funciona", "m-01-how");
  await gotoShot(page, "/pt/login", "m-02-login");
  await login(page, "cliente@movio.app");
  await shot(page, "m-10-customer-dashboard");
  await gotoShot(page, "/pt/pedidos/novo", "m-11-new-trip");
  await gotoShot(page, "/pt/pedidos", "m-12-list");
  if (info.openId) await gotoShot(page, `/pt/pedidos/${info.openId}`, "m-13-offers");
  if (info.confirmedId) {
    await gotoShot(page, `/pt/pedidos/${info.confirmedId}`, "m-14-confirmed");
    await gotoShot(page, `/pt/pedidos/${info.confirmedId}/confirmacao`, "m-15-confirmation");
  }
  if (info.progressId) await gotoShot(page, `/pt/pedidos/${info.progressId}`, "m-16-in-progress");
  await browser.close();

  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await login(p2, "motorista@movio.app");
  await shot(p2, "m-20-driver-dashboard");
  await gotoShot(p2, "/pt/pedidos-abertos", "m-21-open");
  if (info.openId) await gotoShot(p2, `/pt/pedidos/${info.openId}`, "m-22-offer-form");
  await gotoShot(p2, "/pt/viagens", "m-23-trips");
  await b2.close();
}

async function journeyAcceptPayConfirm(info) {
  // Fresh open trip with offers for live accept → pay → confirm screenshots
  if (!info.openId) return;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await login(page, "cliente@movio.app");
  await page.goto(`${BASE}/pt/pedidos/${info.openId}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, "d-50-before-accept");

  const choose = page.getByRole("button", { name: /Escolher/i }).first();
  if (await choose.count()) {
    await Promise.all([
      page.waitForURL(/pagamento/, { timeout: 25000 }),
      choose.click(),
    ]);
    await page.waitForTimeout(700);
    await shot(page, "d-51-payment");
    const confirm = page.getByRole("button", { name: /Confirmar pagamento/i });
    if (await confirm.count()) {
      await Promise.all([
        page.waitForURL(/confirmacao/, { timeout: 25000 }),
        confirm.click(),
      ]);
      await page.waitForTimeout(800);
      await shot(page, "d-52-confirmation-after-pay");
      const tripUrl = page.url();
      const tripId = tripUrl.match(/pedidos\/([^/]+)/)?.[1];
      if (tripId) {
        await gotoShot(page, `/pt/pedidos/${tripId}`, "d-53-journey-after-pay");
        // Advance journey a couple of steps
        for (const label of ["Motorista a caminho", "Motorista chegou", "Iniciar viagem"]) {
          const btn = page.getByRole("button", { name: label });
          if (await btn.count()) {
            await btn.click();
            await page.waitForTimeout(700);
          }
        }
        await shot(page, "d-54-journey-advanced");
      }
    }
  }
  await browser.close();
}

async function recordVideo(info) {
  const browser = await chromium.launch({ headless: true });

  // Desktop customer journey video
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  await login(page, "cliente@movio.app");
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/pedidos/novo`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  if (info.openId) {
    await page.goto(`${BASE}/pt/pedidos/${info.openId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
  }
  if (info.confirmedId) {
    await page.goto(`${BASE}/pt/pedidos/${info.confirmedId}/confirmacao`, {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(1000);
  }
  await context.close();

  // Mobile journey video
  const mContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: VIDEO_DIR, size: { width: 390, height: 844 } },
  });
  const mp = await mContext.newPage();
  await mp.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(700);
  await login(mp, "cliente@movio.app");
  await mp.waitForTimeout(600);
  await mp.goto(`${BASE}/pt/pedidos/novo`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(800);
  if (info.openId) {
    // May already be accepted — still show list
    await mp.goto(`${BASE}/pt/pedidos`, { waitUntil: "networkidle" });
    await mp.waitForTimeout(900);
  }
  await mContext.close();

  // Driver portion
  const dContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
  });
  const dp = await dContext.newPage();
  await login(dp, "motorista@movio.app");
  await dp.waitForTimeout(700);
  await dp.goto(`${BASE}/pt/pedidos-abertos`, { waitUntil: "networkidle" });
  await dp.waitForTimeout(1000);
  await dContext.close();
  await browser.close();

  const clips = fs
    .readdirSync(VIDEO_DIR)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => path.join(VIDEO_DIR, f))
    .sort();

  if (!clips.length) return;

  // Prefer mobile clip for mobile gif (usually mid-size)
  const mobileClip = clips.find((c) => {
    // heuristic: smaller resolution videos — just use second clip if present
    return true;
  });
  const listFile = path.join(VIDEO_DIR, "concat.txt");
  fs.writeFileSync(listFile, clips.map((c) => `file '${c}'`).join("\n"));
  spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", WEBM], {
    encoding: "utf8",
  });
  // Mobile-focused: use middle clip if available
  const mSrc = clips[1] || clips[0];
  fs.copyFileSync(mSrc, MOBILE_WEBM);

  for (const [src, dest] of [
    [WEBM, GIF],
    [MOBILE_WEBM, MOBILE_GIF],
  ]) {
    spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        src,
        "-vf",
        "fps=8,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer",
        "-loop",
        "0",
        dest,
      ],
      { encoding: "utf8" },
    );
    console.log("gif", dest);
  }
  void mobileClip;
}

async function main() {
  console.log(`PR #10 visual proof @ ${BASE}`);
  const info = await ids();
  console.log(info);
  await desktop(info);
  await mobile(info);
  await journeyAcceptPayConfirm(info);
  await recordVideo(info);
  const shots = fs.readdirSync(OUT).filter((f) => f.endsWith(".png")).sort();
  console.log(JSON.stringify({ shots: shots.length, out: OUT, gif: GIF, mobileGif: MOBILE_GIF }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
