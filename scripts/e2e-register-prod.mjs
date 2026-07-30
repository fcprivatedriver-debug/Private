import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://private-duur-xi.vercel.app";

async function tryRegister(role) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const stamp = Date.now();
  const email = `e2e.${role.toLowerCase()}.${stamp}@zelu.test`;
  const logs = [];
  page.on("console", (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));
  page.on("response", (res) => {
    if (res.url().includes("registo") || res.status() >= 400) {
      logs.push(`[http ${res.status()}] ${res.url()}`);
    }
  });

  const url = `${BASE}/pt/registo?role=${role}`;
  console.log("\n===", role, url, email);
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForSelector('select[name="role"]', { timeout: 20000 });
  await page.selectOption('select[name="role"]', role);
  await page.fill('input[name="name"]', `E2E ${role}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="phone"]', "+351912345678");
  await page.fill('input[name="password"]', "zelu1234");

  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);

  const bodyText = await page.locator("body").innerText();
  const alert = await page.locator(".alert-error, .alert").allTextContents().catch(() => []);
  console.log("URL after:", page.url());
  console.log("Alerts:", alert);
  console.log("Body snippet:", bodyText.slice(0, 800).replace(/\s+/g, " "));
  console.log("Logs:\n", logs.slice(-30).join("\n"));
  await page.screenshot({ path: `/tmp/reg-${role}.png`, fullPage: true });
  await browser.close();
}

await tryRegister("DRIVER");
await tryRegister("CUSTOMER");
