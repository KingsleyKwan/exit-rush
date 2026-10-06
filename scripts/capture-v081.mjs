// v0.8.1 captures: char select (split progress), level select hero vs mage, mid-cast colours
import { chromium } from 'playwright';
const OUT = process.env.OUT ?? '/workspace/v081';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?debug=1';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const want = (k) => !ONLY || ONLY.includes(k);
const browser = await chromium.launch({
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
function save({ cleared = 44, lang = 'zh-HK', character = 'hero', mageCleared = [], mageSpent = null } = {}) {
  const earned = cleared;
  const sk = { str: Math.min(20, earned), spd: 10, sta: 10, ultStr: false, ultSpd: false, ultSta: false, points: 0 };
  sk.points = Math.max(0, earned - (sk.str + sk.spd + sk.sta));
  const mageE = mageCleared.length;
  const ms = mageSpent ?? { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: mageE };
  ms.points = Math.max(0, mageE - (ms.str + ms.spd + ms.sta + 10 * (ms.ultStr + ms.ultSpd + ms.ultSta)));
  const progress = {
    hero: { cleared: range(cleared), clears: Object.fromEntries(range(cleared).map((i) => [String(i), 1])), highestCleared: cleared, seenBosses: cleared >= 20 ? [20] : [] },
    mage: { cleared: mageCleared, clears: Object.fromEntries(mageCleared.map((i) => [String(i), 1])), highestCleared: mageCleared.length ? Math.max(...mageCleared) : 0, seenBosses: [] },
    tech: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
  };
  return {
    version: 1, lang, ftueDone: true, character,
    skills: sk, loadouts: [sk, { ...sk, str: 0, spd: 0, sta: 0, points: earned }, { ...sk, str: 0, spd: 0, sta: 0, points: earned }],
    activeLoadout: 0, highestCleared: cleared, cleared: range(cleared),
    clears: progress.hero.clears, quality: 'auto', autoQuality: 'high', typeIcons: true,
    masterVol: 0.8, musicVol: 0.5, sfxVol: 0.8, muted: false,
    seenIntros: ['luggage','stench','family','brat','couple','angry','squat','loud'], seenBosses: progress.hero.seenBosses, respecNotice: false,
    entitlementCache: { mage: true, tech: false, noAds: false, at: Date.now() },
    mage: {
      loadouts: [ms, { ...ms, str: 0, spd: 0, sta: 0, ultStr: false, points: mageE }, { ...ms, str: 0, spd: 0, sta: 0, ultStr: false, points: mageE }],
      active: 0,
      spellBars: [['fire_t1', 'ice_t1', 'volt_t1'], [], []],
    },
    tech: { items: {}, gridTier: 0, sets: [{ placements: [] }, { placements: [] }, { placements: [] }], activeSet: 0, stock: {}, ledger: {}, consumableSpend: 0, retroGranted: false, coinNotice: false },
    clearedWith: {}, trialsPlayed: {}, progress, progressSplitNotice: false,
  };
}

async function boot(data) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
  await page.evaluate((s) => {
    localStorage.setItem('exit-rush-v1', JSON.stringify(s));
    location.reload();
  }, data);
  await page.waitForFunction(() => window.__game, null, { timeout: 20000 });
  await page.waitForTimeout(400);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}`, type: 'png' });
  console.log('saved', name);
}

async function play(levelId) {
  await page.evaluate(async (id) => {
    const g = window.__game;
    g.selectCharacter(g.save.character);
    await g.startLevel(id);
  }, levelId);
  await page.waitForTimeout(300);
}

async function midCast(spellId, outName, face = { x: -1, z: 0 }) {
  await page.evaluate(({ spellId, face }) => {
    const g = window.__game;
    g.player.setSkin('mage');
    g.activeTip = null; g.showFtueGhost = false; g.doorBannerT = 0; g.introKind = null; if (g.screen === 'intro') { g.screen = 'playing'; }
    try {
      const tr = g.train;
      if (tr) { tr.announceUntil = 0; tr.stationKey = ''; tr.setStation(g.level, []); }
    } catch (_) {}
    const p = g.sim.player;
    p.body.x = 0.4; p.body.z = 0.15; p.body.px = p.body.x; p.body.pz = p.body.z;
    p.body.vx = p.body.vz = 0;
    p.faceX = face.x; p.faceZ = face.z;
    p.mana = p.manaMax;
    for (const k of Object.keys(p.spellCd)) p.spellCd[k] = 0;
    const len = Math.hypot(face.x, face.z) || 1;
    const fx = face.x / len, fz = face.z / len;
    let n = 0;
    for (const a of g.sim.crowd.agents) {
      if (a.boss) continue;
      if (n < 4) {
        a.body.x = p.body.x + fx * (1.3 + n * 0.7);
        a.body.z = p.body.z + fz * (1.3 + n * 0.7) + (n - 1.5) * 0.45;
        if (spellId.startsWith('ice')) { a.freezeUntil = g.sim.time + 2; a.chillUntil = g.sim.time + 2; }
        n++;
      } else {
        a.body.x = p.body.x + 3.5; a.body.z = (Math.random() - 0.5) * 5;
      }
      a.body.px = a.body.x; a.body.pz = a.body.z; a.body.vx = a.body.vz = 0;
    }
    g.tryAbility(spellId);
    if (typeof g.flushSimEvents === 'function') g.flushSimEvents();
    const tr = g.train;
    if (tr?.camPos) {
      tr.camPos.set(p.body.x + 2.8, 5.2, p.body.z + 2.4);
      tr.look.set(p.body.x + fx * 1.2, 1.1, p.body.z + fz * 0.8);
      tr.camVel.set(0, 0, 0); tr.lookVel.set(0, 0, 0);
    }
    const frames = spellId.startsWith('fire') ? 18 : spellId.startsWith('ice') ? 3 : 2;
    for (let i = 0; i < frames; i++) g.effects.update(1 / 60);
    if (spellId.startsWith('fire')) for (let i = 0; i < 4; i++) g.effects.update(1 / 60);
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  }, { spellId, face });
  await page.waitForTimeout(60);
  await shot(outName);
}

// Hero cleared 44, mage fresh (L1 only) — different progress bars
await boot(save({ cleared: 44, character: 'hero', mageCleared: [], mageSpent: { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 } }));
await page.evaluate(() => window.__game.openCharacters());
await page.waitForTimeout(700);
await shot('char-select-split-zh.png');

// Level select as hero (advanced)
await page.evaluate(() => { window.__game.selectCharacter('hero'); window.__game.screen = 'levels'; window.__game.hooks.onState(); });
await page.waitForTimeout(500);
await shot('levels-hero-zh.png');

// Level select as mage (L1 only)
await page.evaluate(() => { window.__game.selectCharacter('mage'); window.__game.screen = 'levels'; window.__game.hooks.onState(); });
await page.waitForTimeout(500);
await shot('levels-mage-zh.png');

// Mid-cast colours — mage with enough SP for all T1
await boot(save({
  cleared: 80, character: 'mage',
  mageCleared: range(80),
  mageSpent: { str: 50, spd: 10, sta: 10, ultStr: true, ultSpd: false, ultSta: false, points: 0 },
}));
await page.evaluate(() => window.__game.selectCharacter('mage'));
await play(6);
await midCast('fire_t1', 'mage-fire-red-zh.png', { x: -1, z: 0.15 });
await page.evaluate(() => { const g = window.__game; g.sim.player.mana = g.sim.player.manaMax; for (const k of Object.keys(g.sim.player.spellCd)) g.sim.player.spellCd[k] = 0; });
await midCast('ice_t1', 'mage-ice-blue-zh.png', { x: -1, z: 0 });
await page.evaluate(() => { const g = window.__game; g.sim.player.mana = g.sim.player.manaMax; for (const k of Object.keys(g.sim.player.spellCd)) g.sim.player.spellCd[k] = 0; });
await midCast('volt_t1', 'mage-volt-yellow-zh.png', { x: -0.7, z: 0.7 });

await browser.close();
console.log('done');
