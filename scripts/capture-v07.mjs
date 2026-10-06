// v0.7 captures (390x844 dpr2): level select, L32/L33/L45/L77/L99 signs, respec + loadouts, bosses.
// Needs `npx vite preview --port 4173`. ONLY=levelselect,l45,... to run a subset.
import { chromium } from 'playwright';
const OUT = process.env.OUT ?? '/workspace/v07';
const URL = 'http://127.0.0.1:4173/?debug=1';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (k) => !ONLY || ONLY.includes(k);
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const ALL = ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat', 'loud'];
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
/** v0.7 economy: 1 SP per first clear → keep spent ≤ cleared so no respec notice fires. */
function save({ cleared = 44, lang = 'zh-HK', skills, loadouts, active = 0, seenBosses = [] } = {}) {
  const c = range(cleared);
  const sk = skills ?? { str: 15, spd: 14, sta: 14, ultStr: false, ultSpd: false, ultSta: false, points: cleared - 43 };
  return {
    version: 1, lang, ftueDone: true, skills: sk,
    loadouts: loadouts ?? [sk, { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: cleared }, { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: cleared }],
    activeLoadout: active,
    highestCleared: cleared, cleared: c, clears: Object.fromEntries(c.map((i) => [String(i), 1])),
    quality: 'auto', autoQuality: 'high', typeIcons: true, masterVol: 0.8, musicVol: 0.5, sfxVol: 0.8, muted: true,
    seenIntros: ALL, seenBosses,
  };
}
async function boot(s) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((v) => localStorage.setItem('exit-rush-v1', JSON.stringify(v)), s);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log('saved', name);
};
async function openLevels() {
  await page.locator('.tile[data-act="levels"]').click();
  await page.waitForTimeout(700);
}
/** Start a level straight into play (skip cutscene / intro), let the crowd settle, freeze. */
async function play(id, settle = 1.2) {
  await page.evaluate((id) => window.__game.startLevel(id), id);
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const g = window.__game;
    if (g.screen === 'boss') g.skipBossCut();
    if (g.screen === 'intro') g.dismissIntro(true);
  });
  await page.waitForTimeout(settle * 1000);
}
const freeze = () => page.evaluate(() => {
  const g = window.__game;
  g.doorBannerT = 0;
  for (const a of g.sim.crowd.agents) { a.body.vx = a.body.vz = 0; }
  g.sim.player.body.vx = g.sim.player.body.vz = 0;
  g.hitStop = 30;
});

if (want('levelselect')) {
  await boot(save({ cleared: 44 }));
  await openLevels();
  // scroll so cleared boss L40 (and L30) are on screen
  await page.locator('[data-jump="31"]').click();
  await page.waitForTimeout(900);
  await shot('levelselect.png');
}
if (want('levelselect-bottom')) {
  await boot(save({ cleared: 99, skills: { str: 33, spd: 33, sta: 33, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await openLevels();
  await page.locator('[data-jump="100"]').click();
  await page.waitForTimeout(900);
  await shot('levelselect-bottom.png');
}
if (want('levelselect-en')) {
  // EN UI, jump to 31: checks long names (Down-to-Earth Town, Hong City University) on the cards.
  await boot(save({ cleared: 44, lang: 'en' }));
  await openLevels();
  await page.locator('[data-jump="31"]').click();
  await page.waitForTimeout(900);
  // one clear mark per card (boss / exam tiles included)
  console.log('marks', await page.evaluate(() => [...document.querySelectorAll('.lv-card.boss.done, .lv-card.exam.done')].map((c) => `${c.dataset.id}:${c.querySelectorAll('.lv-state .ico').length}`).join(' ')));
  await shot('levelselect-en.png');
}
for (const id of [32, 33, 45, 77, 99]) {
  if (!want(`l${id}`)) continue;
  await boot(save({ cleared: 99, skills: { str: 33, spd: 33, sta: 33, ultStr: false, ultSpd: false, ultSta: false, points: 0 }, lang: process.env.LANG_UI ?? 'zh-HK' }));
  await play(id, 1.4);
  await freeze();
  await page.waitForTimeout(200);
  await shot(`l${id}.png`);
}
if (want('respec-tree') || want('respec-confirm')) {
  await boot(save({ cleared: 44, skills: { str: 20, spd: 14, sta: 10, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await page.evaluate(() => window.__game.openSkills());
  await page.waitForTimeout(900);
  if (want('respec-tree')) await shot('respec-tree.png');
  if (want('respec-confirm')) {
    await page.locator('[data-lo-reset]').first().click();
    await page.waitForTimeout(500);
    await shot('respec-confirm.png');
  }
}
if (want('respec-prelevel')) {
  await boot(save({ cleared: 44, skills: { str: 20, spd: 14, sta: 10, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await play(44, 0.5);
  // Win: walk the player out of the door.
  await page.evaluate(() => {
    const g = window.__game, s = g.sim, b = s.player.body;
    b.x = b.px = -2.6; b.z = b.pz = s.openBays[0];
  });
  await page.waitForTimeout(2200);
  await shot('respec-prelevel.png');
}
/** Pin the cutscene at `at` s (game camera + CSS timeline) so slow software GL can't desync the still. */
async function cutscene(id, name, at = 1.3, lang = 'zh-HK') {
  await boot(save({ cleared: 99, lang, skills: { str: 33, spd: 33, sta: 33, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await page.evaluate((id) => window.__game.startLevel(id), id);
  await page.waitForTimeout(300);
  await page.evaluate((at) => {
    const c = window.__game.bossCut;
    c.hold = true;
    c.t = at;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = at * 1000; }
  }, at);
  await page.waitForTimeout(2500); // camera spring settles on the boss
  await page.evaluate(() => { window.__game.hitStop = 30; });
  await shot(name);
}
if (want('boss-cutscene-L20')) await cutscene(20, 'boss-cutscene-L20.png');
if (want('boss-cutscene-L80')) await cutscene(80, 'boss-cutscene-L80.png', 1.25, 'en');
if (want('boss-play-L40')) {
  await boot(save({ cleared: 99, skills: { str: 33, spd: 33, sta: 33, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await play(40, 0.6);
  // Player leaning on the 踎低王 in the doorway, bar half drained.
  await page.evaluate(() => {
    const g = window.__game, s = g.sim, b = s.player.body;
    const boss = s.crowd.bosses()[0];
    b.x = b.px = boss.body.x + boss.body.r + b.r + 0.05; b.z = b.pz = boss.body.z + 0.25;
    for (let i = 0; i < 40; i++) s.step(1 / 60, { x: -1, z: 0, mag: 1, shoveHeld: false });
    boss.boss.stub = 0.45;
  });
  await page.waitForTimeout(500);
  await freeze();
  await page.waitForTimeout(200);
  await shot('boss-play-L40.png');
}
if (want('boss-L100')) {
  await boot(save({ cleared: 99, skills: { str: 33, spd: 33, sta: 33, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
  await play(100, 1.0);
  await freeze();
  await page.waitForTimeout(200);
  await shot('boss-L100.png');
}
if (want('boss-cutscene-L100')) await cutscene(100, 'boss-cutscene-L100.png');
await browser.close();
