// v0.8 captures (390x844 dpr2): char select, mage play mid-cast, boss, spellbook.
import { chromium } from 'playwright';
const OUT = process.env.OUT ?? '/workspace/v08';
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
const ALL = ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat', 'loud'];
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
function save({ cleared = 44, lang = 'zh-HK', character = 'hero', skills, mage, seenBosses = [] } = {}) {
  const c = range(cleared);
  const earned = cleared;
  const spent = (s) => s.str + s.spd + s.sta + 10 * ((s.ultStr ? 1 : 0) + (s.ultSpd ? 1 : 0) + (s.ultSta ? 1 : 0));
  const sk = skills ?? { str: 20, spd: 14, sta: 10, ultStr: false, ultSpd: false, ultSta: false, points: 0 };
  // Fire 50 + ult + ice/volt T1 so spell bar + gold ult show.
  const mageSk = mage ?? { str: 50, spd: 10, sta: 10, ultStr: true, ultSpd: false, ultSta: false, points: 0 };
  if (spent(mageSk) > earned) {
    mageSk.str = Math.min(50, Math.max(10, earned - 20));
    mageSk.spd = 10;
    mageSk.sta = 10;
    mageSk.ultStr = earned >= spent({ ...mageSk, ultStr: true });
  }
  sk.points = Math.max(0, earned - spent(sk));
  mageSk.points = Math.max(0, earned - spent(mageSk));
  return {
    version: 1,
    lang,
    ftueDone: true,
    character,
    skills: sk,
    loadouts: [sk, { ...sk, str: 0, spd: 0, sta: 0, points: earned }, { ...sk, str: 0, spd: 0, sta: 0, points: earned }],
    activeLoadout: 0,
    mage: {
      loadouts: [
        mageSk,
        { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: earned },
        { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: earned },
      ],
      active: 0,
      spellBars: [['fire_t1', 'fire_t3b', 'ice_t1'], [], []],
    },
    tech: {
      items: {},
      gridTier: 0,
      sets: [{ placements: [] }, { placements: [] }, { placements: [] }],
      activeSet: 0,
      stock: {},
      ledger: {},
      consumableSpend: 0,
      retroGranted: false,
      coinNotice: false,
    },
    entitlementCache: { mage: true, tech: true, noAds: true, at: Date.now() },
    clearedWith: {},
    trialsPlayed: {},
    highestCleared: cleared,
    cleared: c,
    clears: Object.fromEntries(c.map((i) => [String(i), 1])),
    quality: 'auto',
    autoQuality: 'high',
    typeIcons: true,
    masterVol: 0.8,
    musicVol: 0.5,
    sfxVol: 0.8,
    muted: true,
    seenIntros: ALL,
    seenBosses,
    respecNotice: false,
  };
}
async function boot(s) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate((v) => localStorage.setItem('exit-rush-v1', JSON.stringify(v)), s);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}` });
  console.log('saved', name);
};
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
const freeze = () =>
  page.evaluate(() => {
    const g = window.__game;
    g.doorBannerT = 0;
    g.showFtueGhost = false;
    g.activeTip = null;
    for (const a of g.sim.crowd.agents) {
      a.body.vx = a.body.vz = 0;
    }
    g.sim.player.body.vx = g.sim.player.body.vz = 0;
    g.hitStop = 30;
  });


async function midCast(spellId, outName, face = { x: -1, z: 0 }) {
  await page.evaluate(({ spellId, face }) => {
    const g = window.__game;
    g.player.setSkin('mage');
    g.activeTip = null;
    g.showFtueGhost = false;
    g.doorBannerT = 0;
    // Freeze platform sign on the normal station face (fiction line) so all shots match.
    try {
      const tr = g.train;
      if (tr && typeof tr.announceUntil !== 'undefined') tr.announceUntil = 0;
      if (tr && g.level && typeof tr.setStation === 'function') {
        tr.stationKey = '';
        tr.setStation(g.level, []);
      }
    } catch (_) { /* ok */ }
    const p = g.sim.player;
    // Open platform lane — mage mid-frame, facing doors (−X)
    p.body.x = 0.4; p.body.z = 0.15;
    p.body.px = p.body.x; p.body.pz = p.body.z;
    p.body.vx = p.body.vz = 0;
    p.faceX = face.x; p.faceZ = face.z;
    p.mana = p.manaMax;
    for (const k of Object.keys(p.spellCd)) p.spellCd[k] = 0;
    const len = Math.hypot(face.x, face.z) || 1;
    const fx = face.x / len, fz = face.z / len;
    // Clear crowd behind / aside; leave 3–4 targets ahead for ice/volt
    let n = 0;
    for (const a of g.sim.crowd.agents) {
      if (a.boss) continue;
      if (n < 4) {
        const span = spellId.startsWith('volt') ? 1.1 : 0.6;
        a.body.x = p.body.x + fx * (1.3 + n * span);
        a.body.z = p.body.z + fz * (1.3 + n * span) + (n - 1.5) * 0.45;
        if (spellId.startsWith('ice')) {
          a.freezeUntil = g.sim.time + 2;
          a.chillUntil = g.sim.time + 2;
        }
        n++;
      } else {
        a.body.x = p.body.x + 3.5 + Math.random();
        a.body.z = (Math.random() - 0.5) * 5;
      }
      a.body.px = a.body.x; a.body.pz = a.body.z;
      a.body.vx = a.body.vz = 0;
    }
    g.tryAbility(spellId);
    if (typeof g.flushSimEvents === 'function') g.flushSimEvents();
    // Camera: pull back a bit, look at mid-spell corridor
    const tr = g.train;
    if (tr?.camPos) {
      tr.camPos.set(p.body.x + 2.8, 5.2, p.body.z + 2.4);
      tr.look.set(p.body.x + fx * 1.2, 1.1, p.body.z + fz * 0.8);
      tr.camVel.set(0, 0, 0);
      tr.lookVel.set(0, 0, 0);
    }
    // Peak frame:
    //  fire — impact burst (~0.45 s flight + grow)
    //  ice  — burst largest (~2–3 frames in)
    //  volt — arcs fully spawned (~1–2 frames)
    const frames = spellId.startsWith('fire') ? 28 : spellId.startsWith('ice') ? 3 : 2;
    for (let i = 0; i < frames; i++) g.effects.update(1 / 60);
    // Fire: grow impact burst + reframe corridor.
    if (spellId.startsWith('fire')) {
      for (let i = 0; i < 4; i++) g.effects.update(1 / 60);
      if (tr?.camPos) {
        tr.camPos.set(p.body.x + 2.6, 5.0, p.body.z + 2.2);
        tr.look.set(p.body.x + fx * 1.6, 1.2, p.body.z + fz * 0.9);
        tr.camVel.set(0, 0, 0);
        tr.lookVel.set(0, 0, 0);
      }
    }
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  }, { spellId, face });
  await page.waitForTimeout(60);
  await shot(outName);
}


if (want('char-select')) {
  await boot(save({ cleared: 44, character: 'hero' }));
  await page.evaluate(() => window.__game.openCharacters());
  await page.waitForTimeout(800);
  await shot('char-select-zh.png');
}
if (want('char-select-en')) {
  await boot(save({ cleared: 44, lang: 'en', character: 'mage' }));
  await page.evaluate(() => window.__game.openCharacters());
  await page.waitForTimeout(800);
  await shot('char-select-en.png');
}
if (want('mage-tree')) {
  await boot(save({ cleared: 80, character: 'mage' }));
  await page.evaluate(() => {
    window.__game.selectCharacter('mage');
    window.__game.openSkills();
  });
  await page.waitForTimeout(1000);
  await shot('mage-spellbook-zh.png');
}
if (want('mage-play') || want('mage-fire') || want('mage-ice') || want('mage-volt')) {
  await boot(save({ cleared: 80, character: 'mage' }));
  await page.evaluate(() => window.__game.selectCharacter('mage'));
  await page.waitForTimeout(200);
  await play(6, 0.7);
  const doFire = want('mage-play') || want('mage-fire');
  const doIce = want('mage-play') || want('mage-ice');
  const doVolt = want('mage-play') || want('mage-volt');
  if (doFire) await midCast('fire_t1', 'mage-play-spell-zh.png', { x: -1, z: 0.15 });
  if (doIce) {
    await page.evaluate(() => { const g = window.__game; g.sim.player.mana = g.sim.player.manaMax; for (const k of Object.keys(g.sim.player.spellCd)) g.sim.player.spellCd[k] = 0; });
    await midCast('ice_t1', 'mage-play-ice-zh.png', { x: -1, z: 0 });
  }
  if (doVolt) {
    await page.evaluate(() => { const g = window.__game; g.sim.player.mana = g.sim.player.manaMax; for (const k of Object.keys(g.sim.player.spellCd)) g.sim.player.spellCd[k] = 0; });
    await midCast('volt_t1', 'mage-play-volt-zh.png', { x: -0.7, z: 0.7 });
  }
}
if (want('mage-boss')) {
  await boot(save({ cleared: 80, character: 'mage', seenBosses: [20] }));
  await page.evaluate(() => window.__game.selectCharacter('mage'));
  await page.waitForTimeout(200);
  await play(20, 0.8);
  await page.evaluate(() => {
    const g = window.__game;
    g.player.setSkin('mage');
    g.activeTip = null;
    g.showFtueGhost = false;
    g.doorBannerT = 0;
    try {
      const tr = g.train;
      if (tr) { tr.announceUntil = 0; tr.stationKey = ''; tr.setStation(g.level, []); }
    } catch (_) {}
    const p = g.sim.player;
    // Place mage next to Suitcase King, clear a pocket of normals
    const boss = g.sim.crowd.agents.find((a) => a.boss && a.kind === 'luggage')
      || g.sim.crowd.agents.find((a) => a.boss);
    if (boss) {
      p.body.x = boss.body.x + 1.35;
      p.body.z = boss.body.z + 0.35;
      p.faceX = boss.body.x - p.body.x;
      p.faceZ = boss.body.z - p.body.z;
      const fl = Math.hypot(p.faceX, p.faceZ) || 1;
      p.faceX /= fl; p.faceZ /= fl;
      // Push other agents away so mage is visible
      for (const a of g.sim.crowd.agents) {
        if (a === boss || a.boss) continue;
        const d = Math.hypot(a.body.x - p.body.x, a.body.z - p.body.z);
        if (d < 1.8) {
          a.body.x = p.body.x + 3 + Math.random();
          a.body.z = p.body.z + (Math.random() - 0.5) * 3;
          a.body.px = a.body.x; a.body.pz = a.body.z;
        }
      }
    } else {
      p.body.x = 0.5; p.body.z = 0;
    }
    p.body.px = p.body.x; p.body.pz = p.body.z;
    p.body.vx = p.body.vz = 0;
    p.mana = p.manaMax;
    for (const k of Object.keys(p.spellCd)) p.spellCd[k] = 0;
    g.tryAbility('fire_t1');
    if (typeof g.flushSimEvents === 'function') g.flushSimEvents();
    const tr = g.train;
    if (tr?.camPos) {
      tr.camPos.set(p.body.x + 3.0, 5.4, p.body.z + 2.4);
      tr.look.set(p.body.x - 0.4, 1.1, p.body.z);
      tr.camVel.set(0, 0, 0);
      tr.lookVel.set(0, 0, 0);
    }
    // Mid-flight fireball between mage and Suitcase King
    for (let i = 0; i < 8; i++) g.effects.update(1 / 60);
    g.hitStop = 8;
    g.renderer.render(g.train.scene, g.train.camera);
    g.hooks.onState();
  });
  await page.waitForTimeout(80);
  await shot('mage-boss-zh.png');
}


await browser.close();
console.log('done');
