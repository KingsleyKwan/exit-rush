// 390×844 @2x review shots via system Chrome. No Playwright.
//   URL=http://127.0.0.1:4173/?debug=1 OUT=review-shots node scripts/capture-review.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?debug=1';
const OUT = process.env.OUT ?? 'review-shots';
const PORT = Number(process.env.CDP_PORT ?? 9333);
const MODE = process.env.MODE ?? 'ios';

mkdirSync(OUT, { recursive: true });

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

function baseSave({ lang = 'zh-HK', character = 'hero', techCleared = [], ownTech = false, ownMage = false, kit = false } = {}) {
  const cleared = 12;
  const sk = { str: 4, spd: 4, sta: 4, ultStr: false, ultSpd: false, ultSta: false, points: 0 };
  const progress = {
    hero: { cleared: range(cleared), clears: Object.fromEntries(range(cleared).map((i) => [String(i), 1])), highestCleared: cleared, seenBosses: [] },
    mage: { cleared: [], clears: {}, highestCleared: 0, seenBosses: [] },
    tech: {
      cleared: techCleared,
      clears: Object.fromEntries(techCleared.map((i) => [String(i), 1])),
      highestCleared: techCleared.length ? Math.max(...techCleared) : 0,
      seenBosses: [],
    },
  };
  const placements = kit
    ? [
        { id: 'S1', tier: 1, x: 0, y: 0, rot: 0 },
        { id: 'G1', tier: 1, x: 1, y: 0, rot: 0 },
      ]
    : [];
  return {
    version: 1, lang, ftueDone: true, character,
    skills: sk,
    loadouts: [sk, { ...sk, points: 12 }, { ...sk, points: 12 }],
    activeLoadout: 0,
    highestCleared: cleared,
    cleared: range(cleared),
    clears: progress.hero.clears,
    quality: 'high', autoQuality: 'high', typeIcons: true,
    masterVol: 0, musicVol: 0, sfxVol: 0, muted: true,
    seenIntros: ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat', 'loud'],
    seenBosses: [], respecNotice: false,
    entitlementCache: { mage: ownMage, tech: ownTech, noAds: ownMage || ownTech, at: Date.now() },
    mage: {
      loadouts: [
        { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 },
        { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 },
        { str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0 },
      ],
      active: 0,
      spellBars: [['fire_t1', 'ice_t1', 'volt_t1'], [], []],
    },
    tech: {
      items: kit ? { S1: 1, G1: 1 } : {},
      gridTier: kit ? 2 : 0,
      sets: [{ placements }, { placements: [] }, { placements: [] }],
      activeSet: 0,
      stock: kit ? { K1: 2 } : {},
      ledger: {},
      consumableSpend: 0,
      retroGranted: true,
      coinNotice: false,
    },
    clearedWith: {},
    trialsPlayed: {},
    progress,
    progressSplitNotice: false,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${join(tmpdir(), 'exit-rush-capture')}`,
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  let ver;
  for (let i = 0; i < 40; i++) {
    try {
      ver = await fetch(`http://127.0.0.1:${PORT}/json/version`).then((r) => r.json());
      break;
    } catch {
      await sleep(150);
    }
  }
  if (!ver) throw new Error('Chrome DevTools did not come up');
  ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  let seq = 0;
  const waiters = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiters.has(msg.id)) {
      const { resolve, reject } = waiters.get(msg.id);
      waiters.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    waiters.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  }, sessionId);

  async function boot(data) {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('exit-rush-v1', ${JSON.stringify(JSON.stringify(data))});`,
    }, sessionId);
    await send('Page.navigate', { url: URL }, sessionId);
    await send('Runtime.evaluate', {
      expression: `new Promise((res, rej) => { const t0 = Date.now(); const tick = () => window.__game ? res(true) : (Date.now()-t0>20000 ? rej('no game') : setTimeout(tick, 50)); tick(); })`,
      awaitPromise: true,
    }, sessionId);
    await sleep(500);
  }

  async function shot(name) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
    console.log('saved', name);
  }

  async function evalJs(expression) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }

  const suffix = MODE;
  await boot(baseSave({ lang: 'zh-HK' }));
  await shot(`menu-zh-${suffix}.png`);
  await evalJs(`window.__game.openCharacters()`);
  await sleep(400);
  await shot(`chars-zh-${suffix}.png`);
  await evalJs(`document.querySelector('.char-body')?.scrollTo(0, 99999)`);
  await sleep(200);
  await shot(`chars-foot-zh-${suffix}.png`);

  await boot(baseSave({ lang: 'en' }));
  await shot(`menu-en-${suffix}.png`);
  await evalJs(`window.__game.openCharacters()`);
  await sleep(400);
  await shot(`chars-en-${suffix}.png`);
  await evalJs(`document.querySelector('.char-body')?.scrollTo(0, 99999)`);
  await sleep(200);
  await shot(`chars-foot-en-${suffix}.png`);

  const techCleared = range(40);
  await boot(baseSave({ lang: 'zh-HK', character: 'tech', techCleared, ownTech: true, kit: true }));
  await evalJs(`window.__game.selectCharacter('tech'); window.__game.openScreen('skills');`);
  await sleep(400);
  await shot(`workshop-equip-zh-${suffix}.png`);
  await evalJs(`document.querySelector('[data-tab="shop"]')?.click()`);
  await sleep(300);
  await shot(`workshop-shop-zh-${suffix}.png`);

  await boot(baseSave({ lang: 'en', character: 'tech', techCleared, ownTech: true, kit: true }));
  await evalJs(`window.__game.selectCharacter('tech'); window.__game.openScreen('skills');`);
  await sleep(300);
  await evalJs(`document.querySelector('[data-tab="shop"]')?.click()`);
  await sleep(300);
  await shot(`workshop-shop-en-${suffix}.png`);
  await evalJs(`document.querySelector('[data-tab="equip"]')?.click()`);
  await sleep(250);
  await shot(`workshop-equip-en-${suffix}.png`);

  await evalJs(`window.__game.startLevel(1)`);
  await sleep(700);
  await shot(`hud-l1-en-${suffix}.png`);
  await evalJs(`(() => { const g = window.__game; const s = g.sim; if (!s) return 'no sim'; const wall = s.player.body.x; s.player.body.x = -20; s.player.body.px = -20; s.doorOpen = 1; return 'moved'; })()`);
  await sleep(600);
  await shot(`result-en-${suffix}.png`);

  await boot(baseSave({ lang: 'zh-HK', character: 'tech', techCleared, ownTech: true, kit: true }));
  await evalJs(`window.__game.selectCharacter('tech'); window.__game.startLevel(1)`);
  await sleep(700);
  await shot(`hud-l1-zh-${suffix}.png`);
  await evalJs(`(() => { const g = window.__game; const s = g.sim; if (!s) return 'no sim'; s.player.body.x = -20; s.player.body.px = -20; s.doorOpen = 1; return 'moved'; })()`);
  await sleep(600);
  await shot(`result-zh-${suffix}.png`);

  console.log('done', OUT);
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
}
