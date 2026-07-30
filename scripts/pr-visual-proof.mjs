#!/usr/bin/env node
/**
 * Capture Mel PR visual proof: screenshots + flow video/GIF.
 *
 * Usage:
 *   node scripts/pr-visual-proof.mjs --pr 11 [--base http://127.0.0.1:3000]
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
const REPO_PROOF = path.join(process.cwd(), "docs", "pr-proof", `pr-${PR}`);

fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
fs.mkdirSync(path.join(REPO_PROOF, "screenshots-phone"), { recursive: true });

async function login(page, email = "filipe@mel.app") {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", "mel123");
  await Promise.all([
    page.waitForURL(/\/pt\/(hoje|tarefas|captura)/, { timeout: 25000 }),
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
  await shot(page, "10-hoje");
  await gotoShot(page, "/pt/captura", "11-captura");
  await page.fill("#utterance", "cria tarefa comprar flores");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(800);
  await shot(page, "12-captura-resultado");
  await gotoShot(page, "/pt/tarefas", "13-tarefas");
  await gotoShot(page, "/pt/calendario", "14-calendario");
  await gotoShot(page, "/pt/relatorios", "15-relatorios");
  await gotoShot(page, "/pt/definicoes", "16-definicoes");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoShot(page, "/pt/hoje", "m-10-hoje");
  await gotoShot(page, "/pt/captura", "m-11-captura");
  await gotoShot(page, "/pt/tarefas", "m-12-tarefas");

  await browser.close();
}

async function captureFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 390, height: 844 } },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.click('a[href*="login"]');
  await page.waitForLoadState("networkidle");
  await page.fill("#email", "filipe@mel.app");
  await page.fill("#password", "mel123");
  await Promise.all([
    page.waitForURL(/\/pt\/hoje/, { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/pt/captura`, { waitUntil: "networkidle" });
  await page.fill("#utterance", "marca almoço amanhã às 13");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/pt/calendario`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.goto(`${BASE}/pt/relatorios`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  await context.close();
  await browser.close();

  const videos = fs.readdirSync(VIDEO_DIR).filter((f) => f.endsWith(".webm"));
  if (videos[0]) {
    fs.copyFileSync(path.join(VIDEO_DIR, videos[0]), WEBM);
    console.log("webm", WEBM);
  }
}

function toGif() {
  if (!fs.existsSync(WEBM)) return;
  const ffmpeg = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      WEBM,
      "-vf",
      "fps=10,scale=390:-1:flags=lanczos",
      GIF,
    ],
    { encoding: "utf8" },
  );
  if (ffmpeg.status === 0) console.log("gif", GIF);
  else console.warn("ffmpeg gif failed", ffmpeg.stderr?.slice(0, 400));
}

function publishToRepo() {
  const phoneDir = path.join(REPO_PROOF, "screenshots-phone");
  for (const file of fs.readdirSync(OUT)) {
    if (!file.endsWith(".png")) continue;
    const src = path.join(OUT, file);
    const jpg = path.join(phoneDir, file.replace(/\.png$/, ".jpg"));
    const converted = spawnSync(
      "ffmpeg",
      ["-y", "-i", src, "-q:v", "3", jpg],
      { encoding: "utf8" },
    );
    if (converted.status !== 0) {
      fs.copyFileSync(src, path.join(phoneDir, file));
    }
  }
  if (fs.existsSync(GIF)) {
    fs.copyFileSync(GIF, path.join(REPO_PROOF, "flow-phone.gif"));
  }
  if (fs.existsSync(WEBM)) {
    fs.copyFileSync(WEBM, path.join(REPO_PROOF, "flow-phone.webm"));
  }

  const zipName = `mel-pr-${PR}-visual-proof.zip`;
  const zipPath = path.join(REPO_PROOF, zipName);
  spawnSync("zip", ["-r", zipPath, "."], { cwd: REPO_PROOF, encoding: "utf8" });
  console.log("repo proof", REPO_PROOF);
}

await captureStills();
await captureFlow();
toGif();
publishToRepo();
console.log("done pr", PR);
