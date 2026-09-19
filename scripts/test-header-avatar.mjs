/**
 * Testes A–K do cabeçalho identidade Pessoal/Familiar + fotografia.
 * Corre contra http://127.0.0.1:3000 com db:demo.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const OUT = "/opt/cursor/artifacts/header-avatar-tests";
const EMAIL = "demo@nina.app";
const PASS = "nina123";

fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(id, pass, detail = "") {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
}

/** Minimal 1×1 JPEG */
function tinyJpeg() {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//Z",
    "base64",
  );
}

/** Distinct red JPEG via raw PPM converted — use PNG via canvas in browser instead */
async function makePngBuffer(page, color) {
  return page.evaluate(async (c) => {
    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("AY", 40, 70);
    const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
    const ab = await blob.arrayBuffer();
    return Array.from(new Uint8Array(ab));
  }, color);
}

async function login(page) {
  await page.goto(`${BASE}/pt/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/pt\/(dashboard|lista|guia)/, { timeout: 20000 });
}

async function ensurePersonal(page) {
  const personal = page.locator('.topbar-space-mobile .space-switch-btn[aria-selected="true"]');
  const label = await page.locator(".topbar-space-mobile .space-switch-btn").nth(0).getAttribute("aria-selected");
  if (label !== "true") {
    await page.locator(".topbar-space-mobile .space-switch-btn").nth(0).click();
    await page.waitForTimeout(800);
  }
}

async function ensureFamily(page) {
  const selected = await page.locator(".topbar-space-mobile .space-switch-btn").nth(1).getAttribute("aria-selected");
  if (selected !== "true") {
    await page.locator(".topbar-space-mobile .space-switch-btn").nth(1).click();
    await page.waitForTimeout(800);
  }
}

async function uploadViaMenu(page, bytes, fileName = "avatar.png") {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    (async () => {
      await page.locator(".topbar-avatar-btn").click();
      await page.getByRole("menuitem", { name: "Escolher da galeria" }).click();
    })(),
  ]);
  await chooser.setFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: Buffer.from(bytes),
  });
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const prisma = new PrismaClient();

  try {
    await login(page);
    await page.goto(`${BASE}/pt/lista`, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 390, height: 844 });

    // B) utilizador sem fotografia (estado inicial)
    await ensurePersonal(page);
    await page.waitForTimeout(500);
    const nameB = (await page.locator(".topbar-space-name").innerText()).trim();
    const hasImgB = (await page.locator(".topbar-avatar-img").count()) > 0;
    const hasFallbackB = (await page.locator(".topbar-avatar-fallback").count()) > 0;
    record("B", nameB === "Filipe" && !hasImgB && hasFallbackB, `name=${nameB} img=${hasImgB} fallback=${hasFallbackB}`);
    await page.screenshot({ path: path.join(OUT, "B-pessoal-sem-foto.png"), fullPage: false });

    // D) família sem fotografia
    await ensureFamily(page);
    await page.waitForTimeout(600);
    const nameD = (await page.locator(".topbar-space-name").innerText()).trim();
    const hasImgD = (await page.locator(".topbar-avatar-img").count()) > 0;
    const hasFallbackD = (await page.locator(".topbar-avatar-fallback").count()) > 0;
    const familyActive = (await page.locator(".topbar-space-mobile .space-switch-btn").nth(1).getAttribute("aria-selected")) === "true";
    record(
      "D",
      nameD === "Família Casquinha" && !hasImgD && hasFallbackD && familyActive,
      `name=${nameD} img=${hasImgD} fallback=${hasFallbackD} active=${familyActive}`,
    );
    await page.screenshot({ path: path.join(OUT, "D-familiar-sem-foto.png"), fullPage: false });

    // F) Familiar → Pessoal
    await ensurePersonal(page);
    await page.waitForTimeout(600);
    const nameF = (await page.locator(".topbar-space-name").innerText()).trim();
    const personalActive = (await page.locator(".topbar-space-mobile .space-switch-btn").nth(0).getAttribute("aria-selected")) === "true";
    record("F", nameF === "Filipe" && personalActive, `name=${nameF} active=${personalActive}`);
    await page.screenshot({ path: path.join(OUT, "F-familiar-para-pessoal.png"), fullPage: false });

    // G) upload fotografia pessoal
    const personalPng = await makePngBuffer(page, "#245563");
    await uploadViaMenu(page, personalPng, "pessoal.png");
    await page.waitForTimeout(800);
    const hasImgG = (await page.locator(".topbar-avatar-img").count()) > 0;
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    const hasDbG = Boolean(user?.image?.startsWith("/api/uploads/profiles/"));
    record("G", hasImgG && hasDbG, `img=${hasImgG} db=${user?.image || "null"}`);
    await page.screenshot({ path: path.join(OUT, "G-upload-pessoal.png"), fullPage: false });

    // A) utilizador com fotografia
    const nameA = (await page.locator(".topbar-space-name").innerText()).trim();
    const hasImgA = (await page.locator(".topbar-avatar-img").count()) > 0;
    record("A", nameA === "Filipe" && hasImgA, `name=${nameA} img=${hasImgA}`);
    await page.screenshot({ path: path.join(OUT, "A-pessoal-com-foto.png"), fullPage: false });

    // C) família com fotografia — upload no modo familiar
    await ensureFamily(page);
    await page.waitForTimeout(600);
    const familyPng = await makePngBuffer(page, "#c45c26");
    await uploadViaMenu(page, familyPng, "familia.png");
    await page.waitForTimeout(800);
    const nameC = (await page.locator(".topbar-space-name").innerText()).trim();
    const hasImgC = (await page.locator(".topbar-avatar-img").count()) > 0;
    const fam = await prisma.family.findFirst({ where: { name: "Família Casquinha" } });
    const hasDbC = Boolean(fam?.image?.startsWith("/api/uploads/profiles/"));
    record("C", nameC === "Família Casquinha" && hasImgC && hasDbC, `name=${nameC} img=${hasImgC} db=${fam?.image || "null"}`);
    await page.screenshot({ path: path.join(OUT, "C-familiar-com-foto.png"), fullPage: false });

    // E) Pessoal → Familiar (já em familiar; switch to personal then family)
    await ensurePersonal(page);
    await page.waitForTimeout(500);
    const imgPersonal = await page.locator(".topbar-avatar-img").getAttribute("src");
    await ensureFamily(page);
    await page.waitForTimeout(600);
    const nameE = (await page.locator(".topbar-space-name").innerText()).trim();
    const imgFamily = await page.locator(".topbar-avatar-img").getAttribute("src");
    record(
      "E",
      nameE === "Família Casquinha" && imgFamily && imgPersonal && imgFamily !== imgPersonal,
      `name=${nameE} personalSrc=${imgPersonal} familySrc=${imgFamily}`,
    );
    await page.screenshot({ path: path.join(OUT, "E-pessoal-para-familiar.png"), fullPage: false });

    // H) remover fotografia (familiar)
    await page.locator(".topbar-avatar-btn").click();
    await page.getByRole("menuitem", { name: "Remover fotografia" }).click();
    await page.waitForTimeout(1200);
    const hasImgH = (await page.locator(".topbar-avatar-img").count()) > 0;
    const famAfter = await prisma.family.findFirst({ where: { name: "Família Casquinha" } });
    record("H", !hasImgH && !famAfter?.image, `img=${hasImgH} db=${famAfter?.image || "null"}`);
    await page.screenshot({ path: path.join(OUT, "H-remover-familiar.png"), fullPage: false });

    // I) refresh — personal photo still there
    await ensurePersonal(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await ensurePersonal(page);
    const hasImgI = (await page.locator(".topbar-avatar-img").count()) > 0;
    const nameI = (await page.locator(".topbar-space-name").innerText()).trim();
    record("I", hasImgI && nameI === "Filipe", `name=${nameI} img=${hasImgI}`);
    await page.screenshot({ path: path.join(OUT, "I-refresh-persistencia.png"), fullPage: false });

    // J) logout / login — limpar sessão e voltar a autenticar
    await page.goto(`${BASE}/pt/definicoes`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Sair" }).click();
    await page.waitForTimeout(1200);
    await context.clearCookies();
    await page.goto(`${BASE}/pt/login`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="email"]', { state: "attached", timeout: 15000 });
    // Splash PWA pode tapar o form — forçar interação
    await page.locator('input[name="email"]').click({ force: true });
    await page.locator('input[name="email"]').fill(EMAIL, { force: true });
    await page.locator('input[name="password"]').fill(PASS, { force: true });
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/\/pt\/(dashboard|lista|guia)/, { timeout: 20000 });
    await page.goto(`${BASE}/pt/lista`, { waitUntil: "networkidle" });
    await ensurePersonal(page);
    await page.waitForTimeout(600);
    const hasImgJ = (await page.locator(".topbar-avatar-img").count()) > 0;
    const userJ = await prisma.user.findUnique({ where: { email: EMAIL } });
    record("J", hasImgJ && Boolean(userJ?.image), `img=${hasImgJ} db=${userJ?.image || "null"}`);
    await page.screenshot({ path: path.join(OUT, "J-logout-login-persistencia.png"), fullPage: false });

    // K) Compras e navegação
    await page.goto(`${BASE}/pt/lista`, { waitUntil: "networkidle" });
    const comprasOk = (await page.locator("text=Compras").count()) > 0 || (await page.locator(".compras-header, h1").count()) > 0;
    await page.goto(`${BASE}/pt/dashboard`, { waitUntil: "networkidle" });
    const dashOk = page.url().includes("/dashboard");
    await page.click('.mobile-nav-link[href="/pt/lista"]');
    await page.waitForTimeout(800);
    const navOk = page.url().includes("/lista");
    const headerOk = (await page.locator(".topbar-identity").count()) > 0;
    record("K", comprasOk && dashOk && navOk && headerOk, `compras=${comprasOk} dash=${dashOk} nav=${navOk} header=${headerOk}`);
    await page.screenshot({ path: path.join(OUT, "K-compras-navegacao.png"), fullPage: false });

    // Video-like flow: space switch
    await page.goto(`${BASE}/pt/lista`, { waitUntil: "networkidle" });
    await ensurePersonal(page);
    await page.screenshot({ path: path.join(OUT, "flow-01-pessoal.png") });
    await ensureFamily(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "flow-02-familiar.png") });
  } catch (err) {
    console.error("TEST CRASH", err);
    await page.screenshot({ path: path.join(OUT, "crash.png"), fullPage: true }).catch(() => {});
    record("CRASH", false, String(err?.message || err));
  } finally {
    await prisma.$disconnect().catch(() => {});
    await browser.close();
  }

  const summary = path.join(OUT, "RESULTS.md");
  const lines = ["# Header avatar tests A–K", "", ...results.map((r) => `- **${r.id}**: ${r.pass ? "PASS" : "FAIL"}${r.detail ? ` — ${r.detail}` : ""}`), ""];
  fs.writeFileSync(summary, lines.join("\n"));
  console.log("\n" + lines.join("\n"));
  const failed = results.filter((r) => !r.pass).length;
  process.exit(failed ? 1 : 0);
}

main();
