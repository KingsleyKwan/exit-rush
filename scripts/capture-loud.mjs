// v0.6.3 大聲公 captures (390x844 dpr2). Needs `npx vite preview` on :4173.
import { chromium } from 'playwright';
const OUT = '/workspace/v06';
const URL = 'http://127.0.0.1:4173/?debug=1';
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const lang = process.env.LANG_UI ?? 'zh-HK';
const save = (seen) => ({
  version: 1, lang, ftueDone: true,
  skills: { str: 15, spd: 14, sta: 60, ultStr: false, ultSpd: false, ultSta: false, points: 4 },
  highestCleared: 30, cleared: Array.from({ length: 30 }, (_, i) => i + 1),
  clears: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), 1])),
  quality: 'auto', autoQuality: 'high', typeIcons: true, masterVol: 0.8, musicVol: 0.5, sfxVol: 0.8, muted: true,
  seenIntros: seen,
});
const ALL = ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat'];
async function boot(seen = [...ALL, 'loud'], skills) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  const s = save(seen);
  if (skills) s.skills = { ...s.skills, ...skills };
  await page.evaluate((v) => localStorage.setItem('exit-rush-v1', JSON.stringify(v)), s);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log('saved', name);
};
async function openLevel(id) {
  await page.locator('.tile[data-act="levels"]').click();
  await page.waitForTimeout(400);
  const c = page.locator(`.lv-card[data-id="${id}"]`);
  await c.scrollIntoViewIfNeeded();
  await c.click();
  await page.waitForTimeout(700);
}

// 1) Intro card on first appearance (L26, loud not yet seen).
await boot(ALL);
await openLevel(26);
await page.waitForSelector('.intro-card', { timeout: 5000 });
await page.waitForTimeout(500);
await shot('loud-intro.png');

// 2) Gameplay: player inside a loudmouth's noise ring, draining. No STA 60 so the drain is full.
await boot(undefined, { sta: 14, spd: 15, str: 15 });
await openLevel(26);
if (await page.locator('#btn-intro-go').count()) await page.locator('#btn-intro-go').click();
await page.waitForTimeout(900);
const info = await page.evaluate((YAWOFF) => {
  const g = window.__game, s = g.sim, p = s.player, b = p.body;
  const lm = s.crowd.agents.filter((a) => a.kind === 'loud')[0];
  if (!lm) return 'no loudmouth';
  const X = -0.8, Z = 2.0;
  lm.body.x = lm.body.px = X; lm.body.z = lm.body.pz = Z;
  // Clear bystanders inside the ring so the zone reads.
  let k = 0;
  for (const a of s.crowd.agents) {
    if (a === lm) continue;
    for (const o of [a.body, a.caseBody].filter(Boolean)) {
      if (Math.hypot(o.x - X, o.z - Z) < 1.5) { o.x = o.px = 30 + (k % 10); o.z = o.pz = 30 + Math.floor(k / 10); k++; }
    }
  }
  b.x = b.px = X + 0.1; b.z = b.pz = Z + 0.6;
  for (let i = 0; i < 70; i++) {
    lm.body.x = lm.body.px = X; lm.body.z = lm.body.pz = Z;
    b.x = b.px = X + 0.1; b.z = b.pz = Z + 0.6; b.vx = b.vz = 0;
    s.step(1 / 60, { x: 0, z: 0, mag: 0, shoveHeld: false });
  }
  lm.body.vx = lm.body.vz = 0; // else the view re-aims yaw along velocity
  g.hitStop = 30;
  // Face the camera so the phone-to-ear pose + open mouth read in the still (rider facing is random).
  const cam = g.train.camera.position;
  const view = g.crowd.views.get(lm.id);
  if (view) view.yaw = Math.atan2(cam.x - X, cam.z - Z) + YAWOFF;
  window.__loudId = lm.id;
  return `drain=${p.noiseDrain.toFixed(1)}/s stamina=${p.stamina.toFixed(0)}/${p.staminaMax.toFixed(0)}`;
}, Number(process.env.YAWOFF ?? -0.3));
console.log('play', info);
await page.waitForTimeout(1000);
// Time the shot to the 「喂！！」 bubble's on-phase (same formula as Passenger.update).
await page.waitForFunction(() => {
  const ph = (window.__game.clock * 0.7 + window.__loudId * 0.37) % 1;
  return ph > 0.2 && ph < 0.45;
}, null, { timeout: 5000, polling: 16 });
await shot('loud-play.png');

// 3) Skill detail tray for STA 60 Unbothered.
await boot(undefined, { sta: 60 });
await page.locator('.tile[data-act="skills"]').click();
await page.waitForTimeout(800);
await page.locator('.cst-node[data-node="sta_t3c"]').scrollIntoViewIfNeeded();
await page.locator('.cst-node[data-node="sta_t3c"]').click();
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('#cst-detail')?.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(250);
await shot('loud-skill.png');
await browser.close();
