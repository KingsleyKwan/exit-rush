# 逼落車 | HK MTR Exit Rush

Mobile-first 3D crowd-exit game: you are a passenger trying to **get off** the train while Golden Week / rush-hour crowds **force on** (逼上車). Inspired by Hong Kong MTR station vibe (red/white, bilingual signs, line colours) — **original art only**, no copyrighted MTR logos or audio.

> Vertical slice (v0.2.1). Steam-store polish is the aspiration; v0.2 added real crowd physics, counterflow boarding, joystick + shove controls and a juice pass; **v0.2.1 is a balance pass** (see [`docs/BALANCE.md`](docs/BALANCE.md)).

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

Touch / mouse: **drag anywhere** (floating joystick) to steer, **hold ✊** to charge a shove and release to burst. Tap ult icons (when unlocked) during a run. Toggle **EN / 粵** in the HUD.

## Controls

| Input | Action |
|--------|--------|
| Drag anywhere (floating joystick) | Steer / push toward exit (small aim-assist toward gaps; stronger with WIS) |
| Hold ✊ → release | Charged shove burst (stamina cost, short cooldown) |
| 🐂 / 💨 / 🧠 | Ultimates (if unlocked): shockwave · dash · path sense (10 s cooldown) |
| Keyboard | WASD / arrows steer · Space = shove · 1/2/3 = ults · P / Esc = pause |
| 🌐 | Language toggle EN ↔ 粵 |
| 🌳 | Open skill tree (between levels / pause) |

## Status (v0.2.1)

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
| Skill tree + localStorage (save format unchanged) | ✅ |
| i18n EN + zh-HK | ✅ |
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
