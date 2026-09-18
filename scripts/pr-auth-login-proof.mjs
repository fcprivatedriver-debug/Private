#!/usr/bin/env node
/**
 * Visual proof — login / verificação (PR #56).
 * Usage: node scripts/pr-auth-login-proof.mjs --pr 56 --base <url>
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const PR = arg("pr", "56");
const BASE = arg("base", "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = `/opt/cursor/artifacts/screenshots/pr-${PR}-auth`;
const REPO = path.join(process.cwd(), `docs/pr-proof/pr-${PR}-auth`);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(REPO, { recursive: true });

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  fs.copyFileSync(file, path.join(REPO, `${name}.png`));
  console.log("shot", file);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  // A. Landing → Já tenho conta → formulário de login (sem verificação)
  await page.goto(`${BASE}/pt`, { waitUntil: "networkidle" });
  await shot(page, "A00-landing");
  await page.getByRole("link", { name: /Já tenho conta/i }).click();
  await page.waitForURL(/\/pt\/login/, { timeout: 20000 });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await shot(page, "A01-login-form");

  // D. Password errada → erro claro, sem ecrã de verificação
  await page.fill('input[name="email"]', "naoexiste-proof@example.com");
  await page.fill('input[name="password"]', "WrongPass1!");
  await page.click('button[type="submit"]');
  await page.waitForSelector(".form-error", { timeout: 20000 });
  const err = await page.locator(".form-error").innerText();
  console.log("wrong-password error:", err);
  if (!/incorrectos|incorrecta|palavra-passe/i.test(err)) {
    throw new Error(`Unexpected error copy: ${err}`);
  }
  // Não deve haver botão Reenviar (só aparece após credenciais válidas + não verificado)
  const resendVisible = await page.getByRole("button", { name: /Reenviar email/i }).isVisible().catch(() => false);
  console.log("resend visible after wrong password:", resendVisible);
  if (resendVisible) throw new Error("Reenviar não deve aparecer com credenciais inválidas");
  await shot(page, "D01-wrong-password");

  // Confirmar URL sem localhost no ecrã de login
  const url = page.url();
  console.log("login url:", url);
  if (/127\.0\.0\.1|localhost/i.test(url) && !BASE.includes("127.0.0.1") && !BASE.includes("localhost")) {
    throw new Error(`Unexpected loopback redirect: ${url}`);
  }

  await browser.close();
  console.log("AUTH PROOF OK", { base: BASE, out: OUT });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
