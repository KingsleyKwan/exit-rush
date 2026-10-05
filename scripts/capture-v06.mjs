import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = '/workspace/hk-mtr-exit-rush/docs/screens-v06';
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: false, type: 'jpeg', quality: 85 });
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

const save = {
  version: 1,
  lang: 'zh-HK',
  ftueDone: true,
  skills: { str: 30, spd: 20, sta: 25, ultStr: false, ultSpd: false, ultSta: false, points: 35 },
  highestCleared: 12,
  cleared: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  clears: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => [String(i), 1])),
  quality: 'auto',
  autoQuality: 'high',
  typeIcons: true,
  masterVol: 0.8,
  musicVol: 0.5,
  sfxVol: 0.8,
  muted: true,
  seenIntros: ['luggage'],
};

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate((s) => localStorage.setItem('hk-mtr-exit-rush-v1', JSON.stringify(s)), save);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await page.locator('.tile[data-act="skills"]').click({ timeout: 10000 });
await page.waitForTimeout(900);
await shot(page, '01-skill-tree.jpg');

// Fresh nav from menu for levels (avoid flaky skills back)
await page.evaluate((s) => localStorage.setItem('hk-mtr-exit-rush-v1', JSON.stringify(s)), save);
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

await page.locator('.tile[data-act="levels"]').click({ timeout: 10000 });
await page.waitForTimeout(700);
const l8 = page.locator('.lv-card[data-id="8"]');
await l8.scrollIntoViewIfNeeded();
await l8.click({ timeout: 10000 });
await page.waitForTimeout(1100);
await shot(page, '02-squat-intro.jpg');

const go = page.locator('#btn-intro-go');
if (await go.count()) {
  await go.click();
  await page.waitForTimeout(2400);
}
await shot(page, '03-midcar-doors.jpg');

await page.setViewportSize({ width: 960, height: 540 });
await page.waitForTimeout(700);
await shot(page, '04-midcar-doors-wide.jpg');

await browser.close();
console.log('done');
