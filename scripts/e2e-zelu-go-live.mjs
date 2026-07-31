import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://private-duur-p7al89nvl-fc-private-driver.vercel.app";

async function register(role, password = "zelu12345") {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const stamp = Date.now();
  const email = `e2e.${role.toLowerCase()}.${stamp}@zelu.test`;

  await page.goto(`${BASE}/pt/registo?role=${role}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('select[name="role"]', { timeout: 30000 });
  await page.selectOption('select[name="role"]', role);
  await page.fill('input[name="name"]', `E2E ${role}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', "+351912345678");
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(14000);

  const url = page.url();
  const alerts = await page.locator(".alert-error, .alert").allTextContents();
  const body = (await page.locator("body").innerText()).slice(0, 250).replace(/\s+/g, " ");
  const brandHits = (await page.content()).includes("ZELU");
  const zrikHits = (await page.content()).includes("ZRIK");

  let ok = false;
  if (role === "DRIVER") ok = url.includes("/onboarding") || url.includes("/painel");
  else ok = url.includes("/pedidos");

  console.log(JSON.stringify({ role, email, url, ok, alerts, brandHits, zrikHits, body }));

  // login round-trip
  if (ok) {
    const sair = page.locator('button:has-text("Sair")');
    if (await sair.count()) {
      await sair.first().click();
      await page.waitForTimeout(2500);
    }
    await page.goto(`${BASE}/pt/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(10000);
    const loginUrl = page.url();
    const loginOk = !loginUrl.includes("/login");
    console.log(JSON.stringify({ role, step: "login", loginUrl, loginOk }));
    await browser.close();
    return { ok: ok && loginOk, email, password };
  }

  await browser.close();
  return { ok: false, email, password };
}

async function duplicateError() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`${BASE}/pt/registo?role=CUSTOMER`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('select[name="role"]');
  await page.fill('input[name="name"]', "Dup");
  await page.fill('input[name="email"]', "cliente@movio.app");
  await page.fill('input[name="password"]', "zelu12345");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);
  const alerts = await page.locator(".alert-error, .alert").allTextContents();
  const body = (await page.locator("body").innerText()).slice(0, 300).replace(/\s+/g, " ");
  console.log(JSON.stringify({ step: "duplicate", url: page.url(), alerts, body }));
  await browser.close();
  return alerts.some((a) => /email|regist/i.test(a));
}

const driver = await register("DRIVER");
const customer = await register("CUSTOMER");
const dupOk = await duplicateError();
console.log("SUMMARY", { driver: driver.ok, customer: customer.ok, duplicateMessage: dupOk });
process.exit(driver.ok && customer.ok ? 0 : 1);
