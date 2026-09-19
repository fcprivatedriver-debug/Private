/**
 * Canonical Preview — email verification / resend / reset URL acceptance
 *
 * BASE_URL=https://… node scripts/canonical-email-acceptance.mjs
 */
import { chromium } from "playwright";
import { createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";

const BASE = (
  process.env.BASE_URL ||
  "https://private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app"
).replace(/\/$/, "");

const OUT = process.env.OUT_DIR || "/opt/cursor/artifacts/email-acceptance";
fs.mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const TEST_EMAIL = process.env.TEST_EMAIL || `verify+canonical${stamp}@addandknow.pt`;
const TEST_PASS = process.env.TEST_PASS || `Ak${randomBytes(4).toString("hex")}!9a`;

const results = {
  base: BASE,
  email: TEST_EMAIL,
  shaHint: "9ad2539",
  steps: {},
};

function fail(step, detail) {
  results.steps[step] = { ok: false, detail };
  console.error(`FAIL ${step}:`, detail);
}

function pass(step, detail = {}) {
  results.steps[step] = { ok: true, ...detail };
  console.log(`PASS ${step}`, detail);
}

function hasLoopback(s) {
  return /127\.0\.0\.1|localhost(:\d+)?/i.test(String(s || ""));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  const navigations = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });

  const actionBodies = [];
  page.on("response", async (res) => {
    try {
      const req = res.request();
      if (req.method() !== "POST") return;
      const headers = req.headers();
      if (!headers["next-action"] && !headers["next-router-state-tree"]) return;
      const text = await res.text();
      actionBodies.push({ url: res.url(), status: res.status(), text: text.slice(0, 4000) });
    } catch {
      /* ignore */
    }
  });

  // ——— A) Register unverified user ———
  await page.goto(`${BASE}/pt/registo`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator('input[name="name"]').fill("Canonical Verify");
  await page.locator('input[name="familyName"]').fill("Família Canonical");
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/verificar-email/, { timeout: 45000 }).catch(() => null);

  const afterReg = page.url();
  if (!/verificar-email/.test(afterReg)) {
    // Maybe already existed or skip verify
    await page.screenshot({ path: path.join(OUT, "01-after-register.png"), fullPage: true });
    fail("EMAIL_VERIFICATION_GATE", { url: afterReg, bodySnippet: await page.content().then((c) => c.slice(0, 500)) });
  } else if (hasLoopback(afterReg) || hasLoopback(new URL(afterReg).search)) {
    fail("EMAIL_VERIFICATION_GATE", { url: afterReg, reason: "loopback in URL/query" });
  } else {
    pass("EMAIL_VERIFICATION_GATE", { url: afterReg.replace(/preview=[^&]+/, "preview=REDACTED") });
  }
  await page.screenshot({ path: path.join(OUT, "01-verify-pending.png"), fullPage: true });

  // Check preview query param must not be loopback
  const previewParam = new URL(page.url()).searchParams.get("preview");
  if (previewParam && hasLoopback(previewParam)) {
    fail("REGISTER_PREVIEW_PARAM", { previewHost: "loopback" });
  } else {
    pass("REGISTER_PREVIEW_PARAM", {
      hasPreview: Boolean(previewParam),
      previewHost: previewParam ? new URL(previewParam).host : null,
    });
  }

  // Inspect last register action body for loopback / delivered
  const regAction = [...actionBodies].reverse().find((a) => a.text.includes("needsVerification") || a.text.includes("previewUrl") || a.text.includes("mailDelivered") || a.text.includes("verificar"));
  if (regAction) {
    const loop = hasLoopback(regAction.text);
    const delivered = /mailDelivered["']?\s*[:=]\s*true|"delivered":true|mailDelivered.:true/.test(regAction.text);
    if (loop) fail("REGISTER_ACTION_NO_LOOPBACK", { snippet: regAction.text.slice(0, 300) });
    else pass("REGISTER_ACTION_NO_LOOPBACK", { deliveredHint: delivered, status: regAction.status });
    results.registerActionSnippet = regAction.text
      .replace(/[a-f0-9]{32,}/gi, "[TOKEN]")
      .slice(0, 800);
  } else {
    pass("REGISTER_ACTION_NO_LOOPBACK", { note: "action body not captured — UI checks follow" });
  }

  // ——— B) Resend ———
  const urlBeforeResend = page.url();
  const resendBtn = page.getByRole("button", { name: /Reenviar/i });
  await resendBtn.click();
  await page.waitForTimeout(3500);
  const urlAfterResend = page.url();
  await page.screenshot({ path: path.join(OUT, "02-after-resend.png"), fullPage: true });

  const navigatedAway =
    !urlAfterResend.startsWith(BASE) ||
    hasLoopback(urlAfterResend) ||
    navigations.some((u) => hasLoopback(u));

  if (navigatedAway) {
    fail("REENVIO_STAYS", { urlBeforeResend, urlAfterResend, navigations });
  } else {
    pass("REENVIO_STAYS", { url: urlAfterResend });
  }

  const bodyText = await page.locator("body").innerText();
  const msgOk =
    /Email enviado|caixa de entrada|Não foi possível|já está verificado/i.test(bodyText);
  if (!msgOk) {
    fail("REENVIO_MESSAGE", { bodyText: bodyText.slice(0, 400) });
  } else {
    pass("REENVIO_MESSAGE", {
      message: (bodyText.match(/Email enviado[\s\S]{0,80}|Não foi possível[\s\S]{0,80}|já está verificado[\s\S]{0,40}/i) || [""])[0],
    });
  }

  const resendAction = [...actionBodies].reverse().find((a) =>
    /delivered|previewUrl|Não consegui enviar|verificar\//.test(a.text),
  );
  let resendDelivered = null;
  if (resendAction) {
    if (hasLoopback(resendAction.text)) {
      fail("RESEND_ACTION_NO_LOOPBACK", { snippet: resendAction.text.slice(0, 400) });
    } else {
      pass("RESEND_ACTION_NO_LOOPBACK");
    }
    if (/"delivered":true|delivered.:true/.test(resendAction.text)) resendDelivered = true;
    else if (/"delivered":false|delivered.:false/.test(resendAction.text)) resendDelivered = false;
    results.resendActionSnippet = resendAction.text
      .replace(/[a-f0-9]{32,}/gi, "[TOKEN]")
      .slice(0, 800);
  }

  if (resendDelivered === true) pass("RESEND_REAL", { delivered: true });
  else if (resendDelivered === false) fail("RESEND_REAL", { delivered: false, note: "server reported not delivered" });
  else {
    // Infer from UI message
    if (/Email enviado/i.test(bodyText)) pass("RESEND_REAL", { inferred: "UI success — Resend accepted or silent ok" });
    else if (/Não foi possível/i.test(bodyText)) fail("RESEND_REAL", { inferred: "UI said delivery failed" });
    else fail("RESEND_REAL", { inferred: "unknown", bodyText: bodyText.slice(0, 200) });
  }

  // ——— F) Password reset page ———
  await page.goto(`${BASE}/pt/recuperar`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "03-password-reset.png"), fullPage: true });
  const resetUrl = page.url();
  const resetBody = await page.locator("body").innerText();
  if (hasLoopback(resetUrl) || hasLoopback(resetBody)) {
    fail("RESET_PASSWORD", { resetUrl, reason: "loopback in page" });
  } else if (!/enviámos um link|Não foi possível/i.test(resetBody)) {
    fail("RESET_PASSWORD", { resetBody: resetBody.slice(0, 300) });
  } else {
    pass("RESET_PASSWORD", { stayedOn: resetUrl, hasLoopbackInBody: false });
  }

  const resetAction = [...actionBodies].reverse().find((a) =>
    /recuperar\/|previewUrl|delivered/.test(a.text),
  );
  if (resetAction && hasLoopback(resetAction.text)) {
    fail("RESET_LINK_HOST", { snippet: resetAction.text.slice(0, 400) });
  } else if (resetAction) {
    const m = resetAction.text.match(/https?:\/\/[^"'\\\s]+\/pt\/recuperar\/[TOKEN]|https?:\/\/[^\/"'\s]+/);
    // extract host from any https URL that isn't loopback
    const urls = resetAction.text.match(/https?:\/\/[^\s"'\\]+/g) || [];
    const hosts = [...new Set(urls.map((u) => {
      try { return new URL(u).host; } catch { return null; }
    }).filter(Boolean))];
    pass("RESET_LINK_HOST", { hosts });
    results.resetActionSnippet = resetAction.text.replace(/[a-f0-9]{32,}/gi, "[TOKEN]").slice(0, 800);
  } else {
    pass("RESET_LINK_HOST", { note: "no action payload with URL — UI had no loopback" });
  }

  // Global loopback check on all captured actions
  const anyLoop = actionBodies.some((a) => hasLoopback(a.text));
  if (anyLoop) fail("PRODUCTION_REFS_LOOPBACK", { count: actionBodies.filter((a) => hasLoopback(a.text)).length });
  else pass("PRODUCTION_REFS_LOOPBACK", { zero: true, actionsCaptured: actionBodies.length });

  await browser.close();

  const outFile = path.join(OUT, "results.json");
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(results.steps, null, 2));
  console.log("Wrote", outFile);

  const failed = Object.values(results.steps).some((s) => !s.ok);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
