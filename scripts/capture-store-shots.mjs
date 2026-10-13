// Capture App Store source screens at 390×844 @3x via headless Chrome CDP.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.URL ?? 'http://127.0.0.1:4173/?debug=1';
const OUT = process.env.OUT ?? 'store/screenshots/_raw';
const PORT = Number(process.env.CDP_PORT ?? 9344);
mkdirSync(OUT, { recursive: true });
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function richSave({
  lang = 'zh-HK',
  character = 'hero',
  clearedN = 99,
  ownMage = true,
  ownTech = true,
  kit = true,
} = {}) {
  const cleared = range(clearedN);
  const sk = { str: 6, spd: 5, sta: 5, ultStr: true, ultSpd: false, ultSta: false, points: 0 };
  const clears = Object.fromEntries(cleared.map((i) => [String(i), 1]));
  const prog = { cleared, clears, highestCleared: clearedN, seenBosses: [20, 30, 40, 50, 60, 70, 80, 90] };
  const placements = kit
    ? [
        { id: 'D3', tier: 2, x: 1, y: 1, rot: 0 },
        { id: 'D5', tier: 2, x: 3, y: 1, rot: 0 },
        { id: 'S2', tier: 2, x: 1, y: 3, rot: 0 },
      ]
    : [];
  const ms = {
    str: 0, spd: 0, sta: 0, ultStr: false, ultSpd: false, ultSta: false, points: 0,
    known: ['w1', 'w2', 'w3', 'i1', 'i2', 'i3', 'g1', 'g2', 'g3', 'iw1', 'iw2', 'ig1', 'wg1'],
  };
  return {
    version: 1, lang, ftueDone: true, character,
    skills: sk,
    loadouts: [sk, { ...sk, points: 4 }, { ...sk, points: 4 }],
    activeLoadout: 0,
    highestCleared: clearedN,
    cleared, clears,
    quality: 'high', autoQuality: 'high', typeIcons: true,
    masterVol: 0, musicVol: 0, sfxVol: 0, muted: true,
    seenIntros: ['luggage', 'stench', 'family', 'brat', 'couple', 'angry', 'squat', 'loud'],
    seenBosses: prog.seenBosses, respecNotice: false,
    entitlementCache: { mage: ownMage, tech: ownTech, noAds: true, at: Date.now() },
    mage: {
      loadouts: [ms, { ...ms }, { ...ms }],
      active: 0,
      spellBars: [['w2', 'i2', 'g2', 'iw1', 'ig1', 'wg1'], [], []],
    },
    tech: {
      items: kit ? { D3: 2, D5: 1, S2: 2, K1: 3, K2: 2 } : {},
      gridTier: kit ? 2 : 0,
      sets: [{ placements }, { placements: [] }, { placements: [] }],
      activeSet: 0,
      stock: kit ? { K1: 2, K2: 1 } : {},
      ledger: {},
      consumableSpend: 0,
      retroGranted: true,
      coinNotice: false,
    },
    clearedWith: {},
    trialsPlayed: {},
    progress: { hero: prog, mage: { ...prog }, tech: { ...prog } },
    progressSplitNotice: false,
  };
}

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-first-run',
  '--no-default-browser-check',
  `--user-data-dir=${join(tmpdir(), 'exit-rush-store-cap')}`,
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  let ver;
  for (let i = 0; i < 50; i++) {
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
  // 390×844 @3 → 1170×2532 source; we upscale to 1320×2868 later
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 3, mobile: true,
  }, sessionId);

  async function boot(data) {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('exit-rush-v1', ${JSON.stringify(JSON.stringify(data))});`,
    }, sessionId);
    await send('Page.navigate', { url: URL }, sessionId);
    await send('Runtime.evaluate', {
      expression: `new Promise((res, rej) => { const t0 = Date.now(); const tick = () => (window.__game && typeof window.__game.startLevel === 'function') ? res(true) : (Date.now()-t0>45000 ? rej('no game') : setTimeout(tick, 50)); tick(); })`,
      awaitPromise: true,
    }, sessionId);
    await sleep(900);
  }

  async function shot(name) {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
    writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
    console.log('saved', name);
  }

  async function evalJs(expression) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result?.value;
  }

  // 1 menu
  await boot(richSave({ lang: 'zh-HK', character: 'hero' }));
  await shot('01-menu-zh.png');

  // 2 packed mid-run (busy mid level)
  await evalJs(`window.__game.startLevel(24)`);
  await sleep(900);
  await evalJs(`(() => { const g = window.__game; const s = g.sim; if (!s) return 'no'; s.player.body.x = 0; s.player.body.px = 0; s.player.body.y = 2; return 'ok'; })()`);
  await sleep(400);
  await shot('02-midrun-zh.png');

  // 3 special/skill moment — luggage intro or mage cast scene: use level with specials + skills open briefly
  await boot(richSave({ lang: 'zh-HK', character: 'mage', ownMage: true }));
  await evalJs(`window.__game.selectCharacter('mage'); window.__game.startLevel(18)`);
  await sleep(1000);
  await shot('03-skill-moment-zh.png');

  // 4 skill tree constellation
  await boot(richSave({ lang: 'zh-HK', character: 'hero' }));
  await evalJs(`window.__game.selectCharacter('hero'); window.__game.openSkills();`);
  await sleep(600);
  await shot('04-skills-zh.png');

  // 5 character select
  await evalJs(`window.__game.openCharacters()`);
  await sleep(500);
  await shot('05-chars-zh.png');

  // 6 late level / fireworks L100
  await evalJs(`window.__game.selectCharacter('hero'); window.__game.startLevel(100)`);
  await sleep(1200);
  await shot('06-l100-zh.png');

  console.log('done', OUT);
} finally {
  try { ws?.close(); } catch {}
  chrome.kill('SIGKILL');
}
