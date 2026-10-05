# 逼落車 | HK MTR Exit Rush

Mobile-first 3D crowd-exit game: you are a passenger trying to **get off** the train while Golden Week / rush-hour crowds **force on** (逼上車). Inspired by Hong Kong MTR station vibe (red/white, bilingual signs, line colours) — **original art only**, no copyrighted MTR logos or audio.

> Vertical slice (v0.2). Steam-store polish is the aspiration; v0.2 adds real crowd physics, counterflow boarding, joystick + shove controls and a juice pass.

## How to run

```bash
cd hk-mtr-exit-rush
npm install
npm run dev      # http://localhost:5173 — best on phone or Chrome device toolbar
npm run build    # production bundle → dist/
npm run preview  # serve dist/
npm run test:sim # headless physics + level-balance check (bot plays every level)
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

## Status (v0.2)

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
| Levels 1–20 + 100 playable (draft curve) | ✅ |
| HUD (door progress + milestones, stamina, timer, cooldowns) | ✅ |
| Skill tree + localStorage (save format unchanged) | ✅ |
| i18n EN + zh-HK | ✅ |
| Placeholder Web Audio SFX (synthesized) | ✅ |
| Levels 21–99 content | 📝 TBD (see `docs/LEVELS.md`) |
| Level timers re-tune for v0.2 physics | 📝 Early levels are generous |
| Capacitor / App Store (native haptics) | ⏳ Roadmap |
| Real MTR-like chimes (licensed) | ⏳ Placeholders only |

Physics & feel tuning knobs live in [`src/game/sim/tuning.ts`](src/game/sim/tuning.ts) (also `window.TUNING` in dev / `?debug`). See [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md#physics--feel).

## Roadmap

1. **Content** — Fill levels 6–99; polish level 100 (十一煙花後尖沙嘴).
2. **Feel** — Animated low-poly characters, per-type SFX, native haptics via Capacitor, re-tune level timers.
3. **Audio** — Commission / license royalty-free MTR-*style* door & arrival cues (never rip official audio).
4. **Mobile wrap** — Capacitor → iOS / Android. **App Store requires an Apple Developer account** ($99/yr).
5. **Polish** — Icon set, station announcement style UI, accessibility, tutorials.

## Docs

- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — full design
- [`docs/LEVELS.md`](docs/LEVELS.md) — station / difficulty draft

## License / assets

Code: project-owned. Visuals & audio are **original placeholders** inspired by HK MTR aesthetics — not affiliated with MTR Corporation.

## No secrets

Do not commit `.env`, keys, or credentials. See `.gitignore`.
