import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/workspace/v06';
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: false, type: 'png' });
  console.log('saved', p);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));

const baseSave = {
  version: 1,
  lang: 'zh-HK',
  ftueDone: true,
  skills: { str: 40, spd: 30, sta: 30, ultStr: false, ultSpd: false, ultSta: false, points: 20 },
  highestCleared: 20,
  cleared: Array.from({ length: 20 }, (_, i) => i + 1),
  clears: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [String(i + 1), 1])),
  quality: 'auto',
  autoQuality: 'high',
  typeIcons: true,
  masterVol: 0.8,
  musicVol: 0.5,
  sfxVol: 0.8,
  muted: true,
  seenIntros: ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat'],
};

const URL = 'http://127.0.0.1:4173/?debug=1';

async function boot(save) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((s) => localStorage.setItem('exit-rush-v1', JSON.stringify(s)), save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}

async function startLevel(id) {
  await page.locator('.tile[data-act="levels"]').click({ timeout: 10000 });
  await page.waitForTimeout(500);
  const card = page.locator(`.lv-card[data-id="${id}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.click({ timeout: 10000 });
  await page.waitForTimeout(400);
  const go = page.locator('#btn-intro-go');
  if (await go.count()) {
    await go.click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(700);
}

// Banner + L8 gameplay
await boot(baseSave);
await startLevel(8);
await shot(page, 'doors-banner-l8.png');
await page.waitForTimeout(900);
await shot(page, 'doors-l8-gameplay.png');

// L16 gameplay — frame a closed bay so decal is readable
await boot(baseSave);
await startLevel(16);
await page.evaluate(() => {
  const g = window.__game;
  if (!g?.sim) return;
  // Park near +Z closed bay (2.6) so camera/sign faces us
  const wall = -1.98;
  const b = g.sim.player.body;
  b.x = b.px = wall + 0.9;
  b.z = b.pz = 2.2;
  g.train.follow({ x: b.x, z: b.z }, 1);
});
await page.waitForTimeout(900);
await shot(page, 'doors-l16-gameplay.png');

// EN toast sanity (language en)
await boot({ ...baseSave, lang: 'en' });
await startLevel(8);
await page.evaluate(() => {
  const g = window.__game;
  if (!g) return;
  g.hooks.onToast?.(g.constructor ? undefined : undefined);
  // Prefer live dict via toast path used in game
  try {
    g.hooks.onToast("This door won't open!");
  } catch (_) {}
  g.train.flashClosedBay(-2.6, 1);
});
await page.waitForTimeout(400);
await shot(page, 'doors-closed-toast-en.png');

await browser.close();
console.log('done');
