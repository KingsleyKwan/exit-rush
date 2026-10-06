<!-- v0.8.1: per-character progress (D12); element colours red/blue/yellow -->
# AGENTS.md — 逼落車 / Exit Rush (香城鐵路 · Hong City Rail)

Read this first, then read **[`docs/APP_STORE.md`](docs/APP_STORE.md)**. It describes the **current mission: ship on the iOS App Store**.
If the owner gave you a kickoff prompt, it is probably [`docs/GROK_BUILD_PROMPT.md`](docs/GROK_BUILD_PROMPT.md).

Owner: **Kingsley Kwan**, a software developer in Hong Kong who plays on iPhone. Repo: `KingsleyKwan/exit-rush` (public).
Live web build: <https://kingsleykwan.github.io/exit-rush/>

---

## 1. What this is

**逼落車 / Exit Rush** is a mobile-first, portrait 3D crowd-physics game. You have to **get off** a packed rush-hour train
before the side doors close, while boarders **force their way on** (逼上車). Levels last about 10–20 s.
The game has special passengers (luggage, squatter, stench, family, brat, couple, angry man, and loudmouth from v0.6.3), boss "kings"
of each type every 10 levels from L20 (v0.7, `src/game/bosses.ts`, `docs/BOSSES.md`), a
3-branch constellation skill tree (力量 STR / 速度 SPD / 體力 STA), per-station themes, original synthesised audio,
and EN + 粵 (zh-HK) UI.

- Version: see `package.json` → `version` (0.8.1). Per-character progress (D12); Fire=red / Ice=blue / Volt=yellow.
- Levels **1–100** are playable. L20/30/…/90 are boss levels (one king each), L99 is the final exam, and L100 (頓沙嘴 · 十一煙花後, all eight kings) unlocks after you clear L99.
- Each **first** clear gives +1 skill point; replays give 0 (100 SP cap). Points are derived from `cleared`. Free respec, plus 3 loadouts (`save.loadouts`, `activeLoadout`).

## 2. Hard rules (do not break)

1. **Never reference the real Hong Kong railway operator** — not its name or abbreviation (English or Chinese, incl. 港鐵),
   its trademarks, logos (incl. its "hollow H" mark), official fonts, or real announcement/door audio — in UI, signs, store
   text, screenshots, metadata, code, comments, file names or identifiers. The operator is the parody
   **香城鐵路 / Hong City Rail (HCR)**. The repo/package is `exit-rush` (renamed in v0.6.3); keep the operator's
   abbreviation out of the whole tree (`rg -i` for it over the repo, excluding node_modules/.git/dist, must return nothing).
   - The save key is `exit-rush-v1`. `src/game/storage.ts` migrates pre-rename keys on first load (the legacy prefix is
     assembled from parts so it never appears literally). **Don't rename the save key** again without a migration,
     or players lose progress. `realEn`/`realZh` fields in `src/game/stations.ts` are dev-only and never shown to players.
   - New identifiers (bundle id, app name, App Store keywords, file names that ship in the bundle) must stay neutral
     (e.g. `exitrush`).
2. **Station and line names come from [`docs/STATIONS.md`](docs/STATIONS.md), which the owner edits.** Don't invent or
   change parody names. If you need a new one, propose it to the owner. `src/game/stations.ts` / `lines.ts` follow that doc.
3. **Icon-first, bilingual UI.** Every player-facing string goes in **both** `src/i18n/en.ts` and `src/i18n/zh-HK.ts`
   (the `Dict` type enforces the same keys). Prefer an icon plus a short label over text. Default language is zh-HK.
   Use colloquial Cantonese in 粵 strings (e.g. 「呢道門不開！」), not Mandarin phrasing.
4. **Assets must be original.** Art is generated with Grok Image or built in code, SFX are Web Audio synthesis, and fonts are
   OFL Noto subsets in `public/fonts/`. Don't add copyrighted, real-railway, or unlicensed assets.
5. **Keep iPhone performance in mind.** A three.js scene, up to 96 physics bodies, and instanced crowds have to run smoothly
   on mid-range iPhones. Measure before and after any rendering change (see `docs/APP_STORE.md` §D).
6. **Keep the web build and GitHub Pages working** next to native. Pages builds with `BASE_PATH=/exit-rush/`
   (`.github/workflows/pages.yml`). Native and local builds use base `/`. Always resolve asset URLs through
   `publicUrl()` (`src/game/publicUrl.ts`) or `import.meta.env.BASE_URL`, never hard-coded `/exit-rush/...`.
   Native-only code must be feature-detected (`Capacitor.isNativePlatform()`), and it must not break or bloat the web build.
7. **Gameplay must not depend on the graphics tier.** The sim (`src/game/sim/`) is the source of truth and runs headless.
   Don't change crowd counts or physics per quality level: that would make balance differ by device.
8. **Review your own screenshots before you call something done.** Capture the affected screens at phone portrait
   size (390×844 @3×, plus a notch/Dynamic Island device in the iOS Simulator for native work) in **both EN and 粵**.
   Then open the images and check them: text clipping, safe-area overlap, icon readability, and no real-operator marks.
9. Don't commit secrets (`.env`, `*.p8`, `*.p12`, provisioning profiles, AdMob or RevenueCat keys). `.gitignore` already covers
   several of these.
10. Don't change `package.json` dependencies, `pages.yml`, or the balance (`levels.ts`, `sim/tuning.ts`) unless the task needs it.
    If you do, explain why in the PR.

## 3. Tech stack

| Layer | Choice |
|-------|--------|
| Language | TypeScript 5.6 (`strict`), ES modules (`"type": "module"`) |
| Bundler / dev server | Vite 5.4 (`vite.config.ts`: `base` from `BASE_PATH`, `three` split into its own chunk, target es2020) |
| 3D | three.js 0.169 (`MeshLambertMaterial`, `InstancedMesh` per character look, PCF shadows on the high tier) |
| UI | Plain DOM + CSS rendered by `src/ui/renderUI.ts` (no framework). Hand-authored SVG icons in `src/ui/icons.ts` |
| Audio | Web Audio synthesis only (`src/game/Audio.ts`). Master/music/sfx buses, iOS unlock on first gesture |
| Persistence | `localStorage` key `exit-rush-v1` (pre-rename keys auto-migrated) with an in-memory fallback (`src/game/storage.ts`) |
| Tests | Headless sim + balance bot (`scripts/simTest.ts`, bundled with esbuild, which comes in through Vite) |
| Deploy | GitHub Actions → GitHub Pages (`.github/workflows/pages.yml`, Node 20, `npm ci`, `BASE_PATH=/exit-rush/`) |
| Native (mission) | **Capacitor 8 → iOS**, not started yet. See `docs/APP_STORE.md` |

Runtime dependency: only `three`. Dev dependencies: `@types/three`, `typescript`, `vite`.

## 4. Folder map

```
index.html                  viewport-fit=cover, no zoom, PWA meta, preloads key art + fonts
vite.config.ts              base = BASE_PATH || '/'; three → separate chunk
package.json                scripts: dev / build / preview / test:sim
public/                     copied verbatim into dist/
  manifest.webmanifest      PWA (portrait, standalone)
  icons/                    icon-512/192, apple-touch-icon (180), favicon-32
  art/                      key-art.webp (title bg), portraits.webp (passenger card strip)
  fonts/                    Noto Sans/Serif HK Bold subsets (OFL), OFL-Noto.txt
store/                      app-icon-1024.png (RGB, no alpha), Steam-style capsules
src/
  main.ts                   boot: fonts, Game, UI render loop, toasts
  style.css, style-constellation.css   all UI CSS (safe-area vars --safe-t/b/l/r)
  i18n/                     index.ts (t(), setLang, fmt), en.ts, zh-HK.ts
  ui/                       renderUI.ts (screen router), menuScreens.ts, playScreens.ts,
                            constellationSkills.ts (skill tree UI), icons.ts, uiShared.ts
  game/
    Game.ts                 orchestrator: renderer, loop (fixed 60 Hz sim + interpolation), screens,
                            lifecycle (visibilitychange/pagehide/blur → auto-pause), quality tier
    sim/                    PURE TS, no three.js: Sim.ts, CrowdSim.ts, PlayerSim.ts, Physics.ts
                            (spatial hash, soft contacts), tuning.ts (all knobs; window.TUNING with ?debug), rng.ts, events.ts
    TrainScene.ts           car, side doors, benches, platform, station signs (render only)
    Crowd.ts, Passenger.ts, Player.ts, characters.ts   render-side crowd / chibi geometry
    PassengerTypes.ts       passenger kinds (normal, stench, family, brat, couple, angry, luggage, squat, loud)
    levels.ts               LEVELS table (1–100; boss levels 20–90 + 100), crowdCount(density)
    bosses.ts               v0.7 boss kings: names 粵/EN, taglines, tints, counters
    intros.ts               special-passenger intro cards
    SkillTree.ts            constellation nodes → modifiersFromSkills()
    storage.ts              SaveData, normalizeSave() migrations, loadSave/writeSave
    Audio.ts                synth SFX + mixer
    haptics.ts              navigator.vibrate wrapper (no-op on iOS Safari → replace with @capacitor/haptics on native)
    quality.ts              Auto/Low/High tiers, FPS probe, pixelRatioFor()
    stations.ts, lines.ts, stationThemes.ts   parody names (from docs/STATIONS.md) + per-station colours
    badges.ts, Effects.ts, Input.ts, fonts.ts, publicUrl.ts
scripts/
  simTest.ts                headless physics + balance harness (npm run test:sim)
  capture-*.mjs             Playwright screenshot scripts (paths hard-coded to /workspace/...; Playwright is NOT a dependency)
  art/build_art.py          Pillow/numpy pipeline: concept art → icons, key art, portraits, store capsules
docs/                       GAME_DESIGN, LEVELS, BOSSES, SKILL_TREE, STATIONS (owner-edited), BALANCE, screens*/,
                            APP_STORE (mission), GROK_BUILD_PROMPT, PRIVACY_POLICY (draft)
.github/workflows/pages.yml GitHub Pages deploy on push to main
```

`.gitignore` already lists `ios/`, `android/`, `.capacitor/` (placeholder "future" entries). For the App Store work the
**`ios/` folder should be committed**. Remove that ignore line in the Capacitor PR (see APP_STORE.md §B).

## 5. Run / dev / build / test

These scripts exist in `package.json` **today**:

```bash
npm install            # or npm ci
npm run dev            # vite dev server, http://localhost:5173 (host: true → reachable from your iPhone on LAN)
npm run build          # tsc && vite build → dist/ (base '/')
npm run preview        # serve dist/
npm run test:sim       # esbuild-bundle scripts/simTest.ts → .cache/simTest.mjs → node (exit 1 on NaN / body cap / runaway overlap)
```

Pages-equivalent build: `BASE_PATH=/exit-rush/ npm run build`.

Sim / balance bot options (env vars read by `scripts/simTest.ts`):

```bash
RUNS=40 npm run test:sim                                     # balance-grade sample
RUNS=40 LEVEL=1,5,6,12,21,30,100 LOADOUTS=none,earned,ult-spd npm run test:sim
# RUNS (alias SEEDS), LEVEL, LOADOUTS (none, earned, pts20, ult-str|spd|sta, or b:STR/SPD/STA[+ult]),
# WORKERS, SEED, JSON=out.json, TUNE='{"..."}' (deep-merge into TUNING), PATCH='{"1":{"timer":45}}' (per-level), COUNTERS=0
```

The test first runs Tier-3 counter-skill unit checks (Hurdle, Leap, Split, Loudmouth drain, …) and a seat-AABB check, and then
prints a per-level table (win %, median time, bodies, ms/step, target band). Balance targets are **reported, not enforced**.
See `docs/BALANCE.md` for the targets.

There's **no lint script and no unit-test framework**. `npm run build` (`tsc`, strict) plus `npm run test:sim` are the gate.
Debug: `?debug` in the URL (or dev mode) exposes `window.__game` and `window.TUNING`.

Node: CI uses Node 20. **Capacitor 8 needs Node ≥ 22**, so use Node 22 LTS locally for native work.

## 6. Architecture notes

- **Sim vs render.** All gameplay physics lives in `src/game/sim/`: circles in the XZ plane, mass, damping, a spatial hash
  (0.9 m cells), 3 soft-contact iterations, and up to `maxBodies` 96. It runs at a **fixed 60 Hz** with an accumulator, and the renderer
  interpolates. The same code runs in Node for `test:sim`, so **never import three.js or the DOM into `sim/`**.
  Render classes (`TrainScene`, `Crowd`, `Player`, `characters`) only read sim state.
- **Levels.** `src/game/levels.ts`, documented in `docs/LEVELS.md`. Each level has density 0–10, boarding pressure, timer,
  special mix, and open door bays (3 → 2 → 1 as levels progress). `crowdCount ≈ 7 + density·3.6`. Specials are introduced every
  ~3 levels with an intro card (`intros.ts`): luggage L6, squat L8, stench L9, family L12, brat L15, couple L18, angry L21, loudmouth L26.
- **Skill tree.** `src/game/SkillTree.ts` + `src/ui/constellationSkills.ts`, documented in `docs/SKILL_TREE.md`. 3 branches, major nodes
  at 10/20/30/40/50/60, Tier 3 = counters to specific passengers, +10 for the ultimate (10 s cooldown). `modifiersFromSkills()`
  feeds the sim.
- **i18n.** `t()` returns the active dictionary, `fmt()` fills `{vars}`, and `setLang()` syncs `<html lang>`. EN and zh-HK must both
  be complete.
- **Audio.** One `AudioContext` with master/music/sfx gain buses. `unlock()` runs on the first user gesture (needed on iOS).
  Audio suspends on hide and resumes on show. Mixer values are saved in the save file.
- **Save / migration.** `SaveData.version` is `1`. `normalizeSave()` merges any old, partial, or corrupt save over the defaults
  (e.g. v0.6 `wis` → `sta`, `ultWis` → `ultSta`). When you add a field, give it a default in `defaultSave()` and handle it in
  `normalizeSave()`. Don't bump `version` unless a breaking change makes you. Native builds should move to Capacitor
  Preferences and keep a localStorage fallback (APP_STORE.md §B.9).
- **Lifecycle.** `Game.ts` auto-pauses on `visibilitychange`, `pagehide`, and `blur`, so the door timer never runs while the
  game is hidden. On native, also hook `@capacitor/app` `pause`/`resume`.
- **Quality.** `quality.ts` sets the tier: `high` = antialias + PCF shadows + pixelRatio ≤ 2, `low` = no shadow map + pixelRatio 1.
  `auto` = device guess, then a 2.5 s FPS probe (< 45 fps → low), with the result cached in the save. Antialias is fixed for the life
  of each WebGL context.
- **Haptics.** `haptics.ts` uses `navigator.vibrate`, which iOS ignores. There are about 13 call sites. On native, route the same
  `haptic()` API to `@capacitor/haptics`.

## 7. Conventions

- Small, focused commits, e.g. `feat(ios): …`, `fix(v0.6.x): …`, `docs: …`. Bump `package.json` version for releases and
  note it in README/docs changelog sections.
- Work on a **branch** and open a PR. Don't push directly to `main`, because `main` auto-deploys Pages.
- Update docs when behaviour changes (GAME_DESIGN / LEVELS / BALANCE / SKILL_TREE / APP_STORE).
- If you change levels or tuning, include before/after `test:sim` numbers.

## 8. Known issues / watch-outs (Oct 2026)

- v0.7 balance: every level 6–99 is in band with earned builds (bot). L5 sits at 93 % (target ≥95 %, original params).
  L100 **ult-str 26 %** is just under its 30–50 % band. Level data 31–99 is generated by the `design.py` / `emit.py` / `tune.py`
  workflow (kept outside the repo); edit `src/game/levels.ts` directly for small tweaks and rerun `test:sim`.
- Boss tuning lives in `TUNING.boss`. Counter micro-tests are in `scripts/simTest.ts`. Sim ids reset per `Sim`
  (`resetBodyIds` / `resetAgentIds`), so tests must not rely on id leakage between scenarios.
- iPhone performance hasn't been profiled on real hardware inside WKWebView. Measure it.
- `scripts/capture-*.mjs` write to `/workspace/v06` / `/workspace/v07` (or `docs/screens-v06` / `$OUT`) and use `/usr/bin/google-chrome`. Adjust locally.
