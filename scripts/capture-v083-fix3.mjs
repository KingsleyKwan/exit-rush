// Recapture pure-wind / pure-ice / mix-ig-sink only (390×844 @2x)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = process.env.OUT ?? '/workspace/v082/vfx';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/exit-rush/?debug=1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const KNOWN = ['w1', 'w2', 'w3', 'i1', 'i2', 'i3', 'g1', 'g2', 'iw1', 'ig1', 'wg1'];

function mageSave() {
  const cleared = range(80);
  const ms = { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0, known: [...KNOWN] };
  return {
    version: 1, lang: 'zh-HK', ftueDone: true, character: 'mage',
    skills: { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 },
    loadouts: [], activeLoadout: 0,
    mage: { loadouts: [ms, { ...ms }, { ...ms }], active: 0, spellBars: [['w2', 'i2', 'g2', 'iw1', 'ig1', 'wg1'], [], []] },
    tech: { items: {}, gridTier: 0, sets: [{ placements: [] }, { placements: [] }, { placements: [] }], activeSet: 0, stock: {}, ledger: {}, consumableSpend: 0, retroGranted: true, coinNotice: false },
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
      tech: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
    },
  };
}

async function boot() {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.evaluate((s) => { localStorage.setItem('exit-rush-v1', JSON.stringify(s)); location.reload(); }, mageSave());
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function play() {
  await page.evaluate(async () => {
    const g = window.__game;
    g.selectCharacter('mage');
    await g.startLevel(6);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = window.__game;
    if (g.screen === 'boss' && g.skipBossCut) g.skipBossCut();
    if (g.screen === 'arrival' && g.skipArrival) g.skipArrival();
    if (g.screen === 'intro' && g.dismissIntro) g.dismissIntro(true);
    g.pendingIntro = null; g.introKind = null;
    if (g.sim) g.sim.ambient = false;
    g.screen = 'playing';
    g.hooks.onState();
  });
  await page.waitForTimeout(400);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}`, type: 'png' });
  console.log('saved', name);
}

async function castShot(spellId, outName, opts = {}) {
  const face = opts.face ?? { x: -1, z: 0.1 };
  const frames = opts.frames ?? 4;
  await page.evaluate(({ spellId, face, frames }) => {
    const g = window.__game;
    g.activeTip = null; g.showFtueGhost = false; g.doorBannerT = 0;
    g.pendingIntro = null; g.introKind = null;
    if (g.sim) g.sim.ambient = false;
    g.screen = 'playing';
    for (const sel of ['.announce', '.toast', '.door-banner', '.ftue', '.tip']) {
      document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; });
    }
    try {
      const tr = g.train;
      if (tr) { tr.announceUntil = 0; tr.stationKey = ''; if (tr.setStation) tr.setStation(g.level, []); }
    } catch (_) {}
    if (g.effects?.clear) g.effects.clear();
    const p = g.sim.player;
    p.body.x = 0.35; p.body.z = 0.15; p.body.px = p.body.x; p.body.pz = p.body.z;
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
        // Line them in the aim cone / ice zone.
        a.body.x = p.body.x + fx * (0.85 + n * 0.5);
        a.body.z = p.body.z + fz * (0.85 + n * 0.5) + (n - 2) * 0.32;
        a.chillUntil = -1; a.coldUntil = -1; a.freezeUntil = -1; a.fleeUntil = -1;
        n++;
      } else {
        a.body.x = p.body.x + 5.5; a.body.z = (Math.random() - 0.5) * 6;
      }
      a.body.px = a.body.x; a.body.pz = a.body.z; a.body.vx = a.body.vz = 0;
    }
    g.tryAbility(spellId);
    try {
      if (g.crowd?.update) g.crowd.update(1, 1 / 20, g.clock, g.train.camera, { x: p.body.x, z: p.body.z });
    } catch (_) {}
    // Peak frame camera: look along the cast.
    const tr = g.train;
    if (tr?.camPos) {
      tr.camPos.set(p.body.x + 1.4, 6.4, p.body.z + 3.6);
      tr.look.set(p.body.x + fx * 1.4, 0.25, p.body.z + fz * 1.0);
      tr.camVel.set(0, 0, 0); tr.lookVel.set(0, 0, 0);
      if (tr.camera) { tr.camera.position.copy(tr.camPos); tr.camera.lookAt(tr.look); }
    }
    for (let i = 0; i < frames; i++) g.effects.update(1 / 60);
    // Nudge passenger views so lean/offset reads.
    try {
      if (g.crowd?.update) g.crowd.update(1, 1 / 30, g.clock, g.train.camera, { x: p.body.x, z: p.body.z });
    } catch (_) {}
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  }, { spellId, face, frames });
  await page.waitForTimeout(80);
  await shot(outName);
}

await boot();
await play();
await castShot('w2', 'pure-wind.png', { frames: 2, face: { x: -1, z: 0.12 } });
await page.evaluate(() => window.__game.effects.clear());
await castShot('i2', 'pure-ice.png', { frames: 5, face: { x: -1, z: 0 } });
await page.evaluate(() => window.__game.effects.clear());
await castShot('ig1', 'mix-ig-sink.png', { frames: 4, face: { x: -1, z: 0 } });

await browser.close();
console.log('done');
