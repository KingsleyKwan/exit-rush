// v0.6.2 Tier-3 captures (390x844 dpr2). Needs `npx vite preview` on :4173.
import { chromium } from 'playwright';
const OUT = '/workspace/v06';
const URL = 'http://127.0.0.1:4173/?debug=1';
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const lang = process.env.LANG_UI ?? 'zh-HK';
const save = {
  version: 1, lang, ftueDone: true,
  skills: { str: 60, spd: 60, sta: 60, ultStr: false, ultSpd: false, ultSta: false, points: 4 },
  highestCleared: 30, cleared: Array.from({ length: 30 }, (_, i) => i + 1),
  clears: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [String(i + 1), 1])),
  quality: 'auto', autoQuality: 'high', typeIcons: true, masterVol: 0.8, musicVol: 0.5, sfxVol: 0.8, muted: true,
  seenIntros: ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat'],
};
async function boot() {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((s) => localStorage.setItem('hk-mtr-exit-rush-v1', JSON.stringify(s)), save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
}
const shot = async (name, full = false) => {
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: full });
  console.log('saved', name);
};

// Skill tree (full page) with Tier 3 unlocked.
await boot();
await page.locator('.tile[data-act="skills"]').click();
await page.waitForTimeout(800);
// Expand the scroll container so the full tree is in one image.
const h = await page.evaluate(() => {
  const body = document.querySelector('.skills-body');
  return body ? body.scrollHeight + 140 : 844;
});
await page.setViewportSize({ width: 390, height: Math.max(844, h) });
await page.waitForTimeout(400);
await shot('t3-skilltree.png', true);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
for (const id of (process.env.NODES ?? 'spd_t3a,spd_t3b,sta_t3b,str_t3c').split(',')) {
  await page.locator(`.cst-node[data-node="${id}"]`).scrollIntoViewIfNeeded();
  await page.locator(`.cst-node[data-node="${id}"]`).click();
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('#cst-detail')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(200);
  await shot(`t3-detail-${id}.png`);
}

// Close-up around the player (projected to CSS px), 2x so the arc reads.
async function zoom(name) {
  const [x, y] = await page.evaluate(() => {
    const g = window.__game; const v = g.player.mesh.position.clone().project(g.train.camera);
    const r = g.renderer.domElement.getBoundingClientRect();
    return [r.left + (v.x + 1) * r.width / 2, r.top + (1 - v.y) * r.height / 2];
  });
  const w = 220, h = 220;
  const cx = Math.max(0, Math.min(390 - w, x - w / 2)), cy = Math.max(0, Math.min(844 - h, y - h * 0.6));
  await page.screenshot({ path: `${OUT}/${name}`, clip: { x: cx, y: cy, width: w, height: h } });
  console.log('saved', name, Math.round(x), Math.round(y));
}

async function startLevel(id) {
  await boot();
  await page.locator('.tile[data-act="levels"]').click();
  await page.waitForTimeout(400);
  const c = page.locator(`.lv-card[data-id="${id}"]`);
  await c.scrollIntoViewIfNeeded();
  await c.click();
  await page.waitForTimeout(400);
  if (await page.locator('#btn-intro-go').count()) await page.locator('#btn-intro-go').click();
  await page.waitForTimeout(900);
}


// Clear bystanders around a spot so the counter reads clearly in a still frame.
const CLEAR = `(s, x, z, keep) => { let k = 0; for (const a of s.crowd.agents) { if (keep.includes(a)) continue; const bodies = [a.body, a.caseBody].filter(Boolean); if (bodies.some((o) => Math.hypot(o.x - x, o.z - z) < 1.6)) { for (const o of bodies) { o.x = o.px = 30 + (k % 10); o.z = o.pz = 30 + Math.floor(k / 10); } k++; } } }`;

// Hurdle over luggage (L7: luggage level). Put the player on a suitcase mid-hop, freeze.
await startLevel(7);
const hurdle = await page.evaluate((CLEAR) => {
  const clear = eval(CLEAR);
  const g = window.__game, s = g.sim, p = s.player, b = p.body;
  // Camera is fixed toward +x: targets around x≈-1.3 (inside the car) land mid-screen.
  const d2 = (o) => (o.x < -1.7 ? 99 : 0) + (o.x + 1.3) ** 2 + (o.z - 0.8) ** 2;
  const lug = s.crowd.agents.filter((a) => a.caseBody).sort((a, c) => d2(a.caseBody) - d2(c.caseBody))[0];
  if (!lug) return 'no luggage';
  const cb = lug.caseBody;
  // Park the pair mid-frame (fixed camera) so the hop is in view.
  const ox = lug.body.x - cb.x, oz = lug.body.z - cb.z;
  cb.x = cb.px = -1.2; cb.z = cb.pz = 0.9; lug.body.x = lug.body.px = -1.2 + ox; lug.body.z = lug.body.pz = 0.9 + oz;
  clear(s, cb.x, cb.z, [lug]);
  b.x = b.px = cb.x + 0.05; b.z = b.pz = cb.z;
  b.vx = -1.5; b.vz = 0;
  for (let i = 0; i < 9; i++) s.step(1 / 60, { x: -1, z: 0, mag: 1, shoveHeld: false });
  clear(s, cb.x, cb.z, [lug]);
  g.hitStop = 30; // freeze sim, keep rendering
  return `case=${cb.x.toFixed(2)},${cb.z.toFixed(2)} me=${b.x.toFixed(2)},${b.z.toFixed(2)} hop=${p.stats.hops} air=${p.airHeight(s.time).toFixed(2)}`;
}, CLEAR);
console.log('hurdle', hurdle);
await page.waitForTimeout(2500);
await shot('t3-play-hurdle.png');
await zoom('t3-play-hurdle-zoom.png');

// Leap over a squatter (L8: squat level). Trigger leap beside one, park overhead mid-arc, freeze.
await startLevel(8);
const leap = await page.evaluate((CLEAR) => {
  const clear = eval(CLEAR);
  const g = window.__game, s = g.sim, p = s.player, b = p.body;
  const sq = s.crowd.agents.filter((a) => a.kind === 'squat' && a.body.x > -1.7).sort((a, c) => Math.hypot(a.body.x + 1.3, a.body.z - 0.8) - Math.hypot(c.body.x + 1.3, c.body.z - 0.8))[0];
  if (!sq) return 'no squat';
  sq.body.x = sq.body.px = -1.2; sq.body.z = sq.body.pz = 0.9;
  clear(s, -1.2, 0.9, [sq]);
  b.x = b.px = sq.body.x + 0.45; b.z = b.pz = sq.body.z;
  p.faceX = -1; p.faceZ = 0;
  s.tryLeap();
  for (let i = 0; i < 12; i++) s.step(1 / 60, { x: -1, z: 0, mag: 1, shoveHeld: false });
  b.x = b.px = sq.body.x + 0.02; b.z = b.pz = sq.body.z; // directly over the squatter
  clear(s, sq.body.x, sq.body.z, [sq]);
  g.hitStop = 30;
  return `leaping=${p.isLeaping(s.time)} air=${p.airHeight(s.time).toFixed(2)} mask=${b.passMask}`;
}, CLEAR);
console.log('leap', leap);
await page.waitForTimeout(2500);
await shot('t3-play-leap.png');
await zoom('t3-play-leap-zoom.png');
await browser.close();
