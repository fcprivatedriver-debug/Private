import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: '/tmp/pw-video', size: { width: 390, height: 844 } },
});
const page = await context.newPage();

await page.goto('http://localhost:3000/pt/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
await page.fill('input[type="email"]', 'demo@nina.app');
await page.fill('input[type="password"]', 'nina123');
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
await page.waitForTimeout(800);

await page.goto('http://localhost:3000/pt/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.hoje-balance-value');
await page.waitForTimeout(1200);

// Space switch
const fam = page.locator('.topbar-space-mobile .space-switch-btn').filter({ hasText: 'Familiar' });
await fam.click({ force: true });
await page.waitForTimeout(1400);
const pes = page.locator('.topbar-space-mobile .space-switch-btn').filter({ hasText: 'Pessoal' });
await pes.click({ force: true });
await page.waitForTimeout(1000);

// FAB menu
await page.locator('.quick-add-fab').click();
await page.waitForTimeout(900);
await page.locator('.quick-add-item').filter({ hasText: 'Despesa' }).click();
await page.waitForURL(/despesas\/nova/);
await page.waitForTimeout(1200);
await page.locator('.expense-more-toggle').click();
await page.waitForTimeout(800);

await page.goto('http://localhost:3000/pt/captura?mode=voice&auto=1');
await page.waitForTimeout(1500);

await page.goto('http://localhost:3000/pt/lista');
await page.waitForTimeout(1200);

await page.goto('http://localhost:3000/pt/definicoes');
await page.waitForTimeout(1200);

await page.goto('http://localhost:3000/pt/dashboard');
await page.waitForTimeout(800);

await context.close();
await browser.close();

const files = fs.readdirSync('/tmp/pw-video').filter((f) => f.endsWith('.webm'));
const src = `/tmp/pw-video/${files[0]}`;
const dest = `${OUT}/redesign-flow-demo.webm`;
fs.copyFileSync(src, dest);
console.log('saved', dest, fs.statSync(dest).size);
// also try ffmpeg to mp4
import('child_process').then(({ execSync }) => {
  try {
    execSync(`ffmpeg -y -i ${dest} -c:v libx264 -pix_fmt yuv420p ${OUT}/redesign-flow-demo.mp4`, { stdio: 'inherit' });
    console.log('mp4 ok');
  } catch (e) {
    console.log('ffmpeg failed', e.message);
  }
});
