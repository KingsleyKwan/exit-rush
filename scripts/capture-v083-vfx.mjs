// v0.8.3 VFX captures (390×844 @2x): distinct school / Gear L silhouettes
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = process.env.OUT ?? '/workspace/v082/vfx';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/exit-rush/?debug=1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
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
const KNOWN = ['w1', 'w2', 'w3', 'i1', 'i2', 'i3', 'g1', 'g2', 'g3', 'iw1', 'iw2', 'ig1', 'wg1'];

function mageSave() {
  const cleared = range(80);
  const ms = {
    str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false,
    points: 0, known: [...KNOWN],
  };
  return {
    version: 1, lang: 'zh-HK', ftueDone: true, character: 'mage',
    skills: { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 },
    loadouts: [],
    activeLoadout: 0,
    mage: {
      loadouts: [ms, { ...ms }, { ...ms }],
      active: 0,
      spellBars: [['w2', 'i2', 'g2', 'iw1', 'ig1', 'wg1'], [], []],
    },
    tech: {
      items: { D3: 2, D4: 1, D5: 2, S2: 2, K1: 3, K2: 2, K3: 2 },
      gridTier: 2,
      sets: [{
        placements: [
          { id: 'D3', x: 1, y: 1, rot: 0, tier: 2 },
          { id: 'D5', x: 3, y: 1, rot: 0, tier: 2 },
          { id: 'S2', x: 1, y: 3, rot: 0, tier: 2 },
        ],
      }, { placements: [] }, { placements: [] }],
      activeSet: 0, stock: { K1: 2, K2: 1 }, ledger: {}, consumableSpend: 0,
      retroGranted: true, coinNotice: false,
    },
    entitlementCache: { mage: true, tech: true, noAds: true, at: Date.now() },
    clearedWith: {}, trialsPlayed: {},
    highestCleared: 80, cleared, clears: Object.fromEntries(cleared.map((i) => [String(i), 1])),
    quality: 'high', autoQuality: 'high', typeIcons: true,
    masterVol: 0, musicVol: 0, sfxVol: 0, muted: true,
    seenIntros: ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat', 'loud'],
    seenBosses: [20], respecNotice: false, progressSplitNotice: false,
    progress: {
      hero: { cleared, clears: Object.fromEntries(cleared.map((i) => [String(i), 1])), highestCleared: 80, seenBosses: [20] },
      mage: { cleared, clears: Object.fromEntries(cleared.map((i) => [String(i), 1])), highestCleared: 80, seenBosses: [20] },
      tech: { cleared, clears: Object.fromEntries(cleared.map((i) => [String(i), 1])), highestCleared: 80, seenBosses: [20] },
    },
  };
}

async function boot(data) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.evaluate((s) => {
    localStorage.setItem('exit-rush-v1', JSON.stringify(s));
    location.reload();
  }, data);
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(500);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}`, type: 'png' });
  console.log('saved', name);
}

async function playAs(character, levelId = 6) {
  await page.evaluate(async ({ character, levelId }) => {
    const g = window.__game;
    g.selectCharacter(character);
    await g.startLevel(levelId);
  }, { character, levelId });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = window.__game;
    if (g.screen === 'boss' && typeof g.skipBossCut === 'function') g.skipBossCut();
    if (g.screen === 'arrival' && typeof g.skipArrival === 'function') g.skipArrival();
    if (g.screen === 'intro' && typeof g.dismissIntro === 'function') g.dismissIntro(true);
    // Force play if still stuck.
    if (g.screen !== 'playing' && g.sim) {
      g.pendingIntro = null;
      g.introKind = null;
      g.sim.ambient = false;
      g.screen = 'playing';
      g.hooks.onState();
    }
  });
  await page.waitForTimeout(500);
}

async function midCast(spellId, outName, opts = {}) {
  const face = opts.face ?? { x: -1, z: 0.1 };
  const frames = opts.frames ?? 4;
  await page.evaluate(({ spellId, face, frames }) => {
    const g = window.__game;
    g.activeTip = null; g.showFtueGhost = false; g.doorBannerT = 0; g.introKind = null;
    g.hooks.onToast?.(''); // clear
    g.pendingIntro = null; g.introKind = null;
    if (g.sim) g.sim.ambient = false;
    g.screen = 'playing';
    try {
      const tr = g.train;
      if (tr) {
        tr.announceUntil = 0; tr.stationKey = '';
        if (typeof tr.setStation === 'function') tr.setStation(g.level, []);
        if (tr.announceEl) tr.announceEl.style.display = 'none';
      }
    } catch (_) {}
    // Hide bottom announcement / toast DOM if present.
    for (const sel of ['.announce', '.toast', '.door-banner', '.ftue', '.tip']) {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }
    const p = g.sim.player;
    p.body.x = 0.2; p.body.z = 0.2; p.body.px = p.body.x; p.body.pz = p.body.z;
    p.body.vx = p.body.vz = 0;
    p.faceX = face.x; p.faceZ = face.z;
    p.mana = p.manaMax;
    for (const k of Object.keys(p.spellCd || {})) p.spellCd[k] = 0;
    const len = Math.hypot(face.x, face.z) || 1;
    const fx = face.x / len, fz = face.z / len;
    let n = 0;
    for (const a of g.sim.crowd.agents) {
      if (a.boss) continue;
      if (n < 5) {
        // Cluster in front of Katie inside the cast volume.
        a.body.x = p.body.x + fx * (0.7 + n * 0.5);
        a.body.z = p.body.z + fz * (0.7 + n * 0.5) + (n - 2) * 0.35;
        a.chillUntil = -1; a.coldUntil = -1; a.freezeUntil = -1; a.fleeUntil = -1;
        n++;
      } else {
        a.body.x = p.body.x + 5; a.body.z = (Math.random() - 0.5) * 6;
      }
      a.body.px = a.body.x; a.body.pz = a.body.z; a.body.vx = a.body.vz = 0;
    }
    if (g.effects?.clear) g.effects.clear();
    g.tryAbility(spellId);
    // After cast: for Cool Breeze, nudge people outward so leave reads.
    if (spellId.startsWith('iw')) {
      for (const a of g.sim.crowd.agents) {
        if (a.boss || a.fleeUntil <= g.sim.time) continue;
        const dx = a.body.x - p.body.x, dz = a.body.z - p.body.z;
        const d = Math.hypot(dx, dz) || 1;
        a.body.x = p.body.x + (dx / d) * 2.4;
        a.body.z = p.body.z + (dz / d) * 2.4;
        a.body.px = a.body.x; a.body.pz = a.body.z;
      }
    }
    const tr = g.train;
    if (tr?.camPos) {
      // Higher iso look-down so floor arrays / lanes read on phone.
      tr.camPos.set(p.body.x + 1.6, 6.2, p.body.z + 3.4);
      tr.look.set(p.body.x + fx * 0.8, 0.35, p.body.z + fz * 0.5);
      tr.camVel.set(0, 0, 0); tr.lookVel.set(0, 0, 0);
      if (tr.camera) {
        tr.camera.position.copy(tr.camPos);
        tr.camera.lookAt(tr.look);
      }
    }
    for (let i = 0; i < frames; i++) g.effects.update(1 / 60);
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  }, { spellId, face, frames });
  await page.waitForTimeout(100);
  await shot(outName);
}

async function gadgetShot(id, outName) {
  await page.evaluate((id) => {
    const g = window.__game;
    g.activeTip = null; g.showFtueGhost = false; g.doorBannerT = 0;
    g.pendingIntro = null; g.introKind = null;
    if (g.sim) g.sim.ambient = false;
    g.screen = 'playing';
    for (const sel of ['.announce', '.toast', '.door-banner']) {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }
    const p = g.sim.player;
    p.body.x = 0.3; p.body.z = 0.1; p.body.px = p.body.x; p.body.pz = p.body.z;
    p.faceX = -1; p.faceZ = 0.15;
    if (g.effects?.clear) g.effects.clear();
    // Place drone lure clearly in front of her (not buried in crowd).
    const lx = p.body.x - 1.2, lz = p.body.z;
    g.effects.gadgetFx(id, lx, lz, -1, 0.15);
    const tr = g.train;
    if (tr?.camPos) {
      tr.camPos.set(lx + 2.2, 5.2, lz + 2.4);
      tr.look.set(lx, 1.2, lz);
      tr.camVel.set(0, 0, 0); tr.lookVel.set(0, 0, 0);
      if (tr.camera) { tr.camera.position.copy(tr.camPos); tr.camera.lookAt(tr.look); }
    }
    for (let i = 0; i < 6; i++) g.effects.update(1 / 60);
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  }, id);
  await page.waitForTimeout(80);
  await shot(outName);
}

await boot(mageSave());
await playAs('mage', 6);
await midCast('iw1', 'cool-breeze.png', { frames: 8, face: { x: -1, z: 0.05 } });
await page.evaluate(() => window.__game.effects.clear());
await midCast('w2', 'pure-wind.png', { frames: 7, face: { x: -1, z: 0.15 } });
await page.evaluate(() => window.__game.effects.clear());
await midCast('i2', 'pure-ice.png', { frames: 6, face: { x: -1, z: 0 } });
await page.evaluate(() => window.__game.effects.clear());
await midCast('g2', 'pure-grav.png', { frames: 5, face: { x: 0, z: -1 } });
await page.evaluate(() => window.__game.effects.clear());
await midCast('ig1', 'mix-ig-sink.png', { frames: 6, face: { x: -1, z: 0 } });

// Gear L active — decoy drone
await boot(mageSave());
await playAs('tech', 6);
await gadgetShot('D3', 'gear-l-drone.png');

await browser.close();
console.log('done →', OUT);
