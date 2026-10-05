# 逼落車 | HK MTR Exit Rush

Mobile-first 3D crowd-exit game: you are a passenger trying to **get off** the train while Golden Week / rush-hour crowds **force on** (逼上車). Inspired by Hong Kong MTR station vibe (red/white, bilingual signs, line colours) — **original art only**, no copyrighted MTR logos or audio.

> Vertical slice (v0.2.2). Steam-store polish is the aspiration; v0.2 added real crowd physics, counterflow boarding, joystick + shove controls and a juice pass; v0.2.1 was a balance pass (see [`docs/BALANCE.md`](docs/BALANCE.md)); **v0.2.2 is a bug-fix / mobile-robustness pass** (see below).

## How to run

```bash
cd hk-mtr-exit-rush
npm install
npm run dev      # http://localhost:5173 — best on phone or Chrome device toolbar
npm run build    # production bundle → dist/
npm run preview  # serve dist/
npm run test:sim # headless physics + level-balance check (bot plays every level)
RUNS=40 npm run test:sim   # balance-grade sample — see docs/BALANCE.md for options
```

Touch / mouse: **drag anywhere** (floating joystick) to steer, **hold ✊** to charge a shove and release to burst. Tap ult icons (when unlocked) during a run. Toggle **EN / 粵** from the menu bar or the pause menu.

## Controls

| Input | Action |
|--------|--------|
| Drag anywhere (floating joystick) | Steer / push toward exit (small aim-assist toward gaps; stronger with WIS) |
| Hold ✊ → release | Charged shove burst (stamina cost, short cooldown) |
| 🐂 / 💨 / 🧠 | Ultimates (if unlocked): shockwave · dash · path sense (10 s cooldown) |
| Keyboard | WASD / arrows steer · Space = shove · 1/2/3 = ults · P / Esc = pause |
| 🌐 | Language toggle EN ↔ 粵 |
| 🌳 | Skill tree — from the menu, or from the pause / result overlay (returns to the run) |
| ⚙️ | Graphics quality: Auto / Low / High (menu) |

## v0.2.2 fixes

- **Skill tree no longer abandons the run.** Opening it from pause (or the win/lose overlay) shows it as an overlay; **Back** returns to the paused run. Points spent mid-run apply from the **next run** (retry / next level) — the current run keeps the loadout it started with, and the panel says so. Only the explicit **Menu** button leaves a run.
- **Auto-pause when backgrounded.** `visibilitychange` (hidden), `pagehide` and window `blur` pause a running level; the AudioContext is suspended while hidden and resumed on return. The game stays paused (with a "paused while you were away" note) until you tap Resume.
- **Saves never throw.** `loadSave`/`writeSave` are wrapped; if storage is blocked (Safari private mode, quota) progress is kept in memory for the session and a one-time toast says it can't be saved. Old saves load unchanged (new fields get defaults).
- **`<html lang>`** follows the EN / 粵 toggle.
- **All UI copy in the dictionaries** (`src/i18n/en.ts`, `zh-HK.ts`), incl. level teaser, skill how-to, “Ult”, seconds unit; a few zh-HK strings made more natural written Cantonese.
- **Graphics quality setting** (persisted, default **Auto**):
  - *High* = previous look: antialias, PCF shadow map, pixel ratio min(DPR, 2).
  - *Low* = no shadow map (cheap blob shadows remain), no antialias, pixel ratio 1.
  - *Auto* starts from device hints (low if `deviceMemory` ≤ 4 GB, ≤ 4 CPU cores, or DPR ≥ 3 with ≤ 6 cores), then a ~2.5 s FPS probe drops High → Low if it averages < 45 fps. The result is cached in the save so later launches create the WebGL context with the right antialias setting. Shadows / pixel ratio switch live; antialias is fixed per WebGL context, so an AA change applies after a reload (the menu notes this).
- **Crowd rendering:** passenger heads and blob shadows are now two shared `InstancedMesh`es (bodies keep a per-agent material for hit flashes); geometries/materials are shared; level restart clears and disposes per-agent objects and reuses the instanced pools (verified: renderer memory stays flat across repeated restarts).
- **Skill-point economy (stop-gap):** with only 21 playable levels, a level now awards a point on its first clear **and on replays, up to 5 points per level** (`MAX_POINTS_PER_LEVEL` in `SkillTree.ts`) → 105 points reachable, enough for a full branch + ultimate and the ~99-point L100 loadout. Set it back to 1 when levels 21–99 ship.
- Mobile polish: brand bar hidden during a run (HUD moves up under the notch), safe-area insets on all sides, every button ≥ 44 px, `prefers-reduced-motion` followed live, three.js split into its own cached chunk.

## Status (v0.2.2)

| Area | Status |
|------|--------|
| Train car + door + platform scene (Three.js) | ✅ |
| Crowd physics: mass, velocity/damping, soft contacts, spatial hash, 60 Hz fixed step | ✅ v0.2 |
| Counterflow boarders (逼上車) + crowd compression / relaxation | ✅ v0.2 |
| Distinct per-type physics (angry shove, couple spring, family cohesion, stench aura, luggage) | ✅ v0.2 |
| Floating joystick + hold-to-shove + WIS gap aim-assist | ✅ v0.2 |
| Juice: camera lag/shake/kick, squash & stretch, puffs, hit-stop, vignettes, haptics | ✅ v0.2 |
| Door-closing warning (flashing lights, accelerating beeps, leaves physically close) | ✅ v0.2 |
| Ultimates: STR shockwave · SPD dash + afterimages · WIS path highlight | ✅ v0.2 |
| Headless sim test (`npm run test:sim`) | ✅ v0.2 |
| Levels 1–20 + 100 playable, **balanced with the sim** (L1 ≈ 15 s, smooth ramp to L20; L100 needs ~99 pts + an ultimate) | ✅ v0.2.1 |
| HUD (door progress + milestones, stamina, timer, cooldowns) | ✅ |
| Skill tree (overlay from pause, returns to run) + localStorage with in-memory fallback | ✅ v0.2.2 |
| Auto-pause on background / blur, audio suspend & resume | ✅ v0.2.2 |
| Graphics quality Auto / Low / High (FPS probe), instanced crowd heads/shadows | ✅ v0.2.2 |
| i18n EN + zh-HK (all UI strings in dictionaries, `<html lang>` synced) | ✅ v0.2.2 |
| Placeholder Web Audio SFX (synthesized) | ✅ |
| Levels 21–99 content | 📝 TBD (see `docs/LEVELS.md`) |
| Balance pass: crowd drag, skill-point scaling, ult parity (SPD dash toned down), multi-run sim harness | ✅ v0.2.1 |
| Capacitor / App Store (native haptics) | ⏳ Roadmap |
| Real MTR-like chimes (licensed) | ⏳ Placeholders only |

Physics & feel tuning knobs live in [`src/game/sim/tuning.ts`](src/game/sim/tuning.ts) (also `window.TUNING` in dev / `?debug`). See [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md#physics--feel).

## Roadmap

1. **Content** — Fill levels 6–99; polish level 100 (十一煙花後尖沙嘴).
2. **Feel** — Animated low-poly characters, per-type SFX, native haptics via Capacitor; playtest the v0.2.1 curve with humans.
3. **Audio** — Commission / license royalty-free MTR-*style* door & arrival cues (never rip official audio).
4. **Mobile wrap** — Capacitor → iOS / Android. **App Store requires an Apple Developer account** ($99/yr).
5. **Polish** — Icon set, station announcement style UI, accessibility, tutorials.

## Docs

- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — full design
- [`docs/LEVELS.md`](docs/LEVELS.md) — station / difficulty draft
- [`docs/BALANCE.md`](docs/BALANCE.md) — v0.2.1 balance table + how to rerun the sim

## License / assets

Code: project-owned. Visuals & audio are **original placeholders** inspired by HK MTR aesthetics — not affiliated with MTR Corporation.

## No secrets

Do not commit `.env`, keys, or credentials. See `.gitignore`.
