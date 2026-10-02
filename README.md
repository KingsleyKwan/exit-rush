# 逼落車 | HK MTR Exit Rush

Mobile-first 3D crowd-exit game: you are a passenger trying to **get off** the train while Golden Week / rush-hour crowds **force on** (逼上車). Inspired by Hong Kong MTR station vibe (red/white, bilingual signs, line colours) — **original art only**, no copyrighted MTR logos or audio.

> Vertical-slice scaffold (v0.1). Steam-store polish is the aspiration; this repo ships a playable core loop for early levels.

## How to run

```bash
cd hk-mtr-exit-rush
npm install
npm run dev      # http://localhost:5173 — best on phone or Chrome device toolbar
npm run build    # production bundle → dist/
npm run preview  # serve dist/
```

Touch / mouse: **swipe or drag** toward the door to push through the crowd. Tap skill buttons (when unlocked) during a run. Toggle **EN / 粵** in the HUD.

## Controls

| Input | Action |
|--------|--------|
| Swipe / drag toward door | Push / move toward exit |
| Tap STR / SPD / WIS icons | Activate skill (if unlocked & charged) |
| 🌐 | Language toggle EN ↔ 粵 |
| 🌳 | Open skill tree (between levels / pause) |
| ▶ | Start / retry level |

## Status (v0.1)

| Area | Status |
|------|--------|
| Train car + door scene (Three.js) | ✅ |
| Crowd of low-poly passenger types | ✅ |
| Levels 1–20 + 100 playable (draft curve) | ✅ |
| Touch swipe / drag | ✅ |
| HUD (door progress, stamina, timer) | ✅ |
| Skill tree + localStorage | ✅ |
| i18n EN + zh-HK | ✅ |
| Placeholder Web Audio SFX | ✅ |
| Levels 21–99 content | 📝 TBD (see `docs/LEVELS.md`) |
| Capacitor / App Store | ⏳ Roadmap |
| Real MTR-like chimes (licensed) | ⏳ Placeholders only |

## Roadmap

1. **Content** — Fill levels 6–99; polish level 100 (十一煙花後尖沙嘴).
2. **Feel** — Better push physics, particle feedback, haptics via Capacitor.
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
