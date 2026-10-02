# Game Design — 逼落車 (Exit Rush)

## Elevator pitch

You must **exit** a packed MTR car before the doors close. Crowds are trying to board (逼上車). Density, passenger types, and timer scale with **station + time of day**. Feel like Golden Week Mong Kok — not a sterile sim.

## Core loop

1. **Select level** (station + time flavour text).
2. **Spawn** in car mid/rear; door ahead; crowd between you and door + inbound boarders.
3. **Push** via swipe/drag. Stamina drains on heavy push; regenerates slowly.
4. **Avoid / negotiate** special passengers (see below).
5. **Reach door zone** with timer > 0 → clear → **+1 skill point**.
6. Spend points in **skill tree**; replay / next level.

### Win

Player AABB overlaps door trigger before `doorsCloseAt` expires. Progress bar fills as distance-to-door shrinks.

### Lose

- Timer hits 0 (doors close / announcement “請勿上落” vibe).
- Stamina hits 0 while pinned (optional soft fail → brief stun; hard fail if still pinned when timer ends).
- (Future) Knocked back into tracks / wrong door — not in v0.1.

## Difficulty axes

| Axis | Effect |
|------|--------|
| Crowd density | More agents, less gaps |
| Boarding pressure | Spawn rate from door inward |
| Special mix | More luggage / angry / families |
| Timer | Shorter close window |
| Car layout | Narrower aisles (future) |

**Level 100 (hardest):** 尖沙嘴 · 十一煙花後 (Tsim Sha Tsui after National Day fireworks) — max density, hostile mix, brutal timer.

## Stations & levels

See [`LEVELS.md`](LEVELS.md). ~20 drafted; remaining TBD up to 100. Naming is bilingual (EN + 粵) and **inspired by** real stations — not an official map product.

## Passenger types

Colour-coded low-poly (box body + capsule/sphere head). Behaviours differ:

| ID | Name EN | 粵 | Colour | Behaviour |
|----|---------|-----|--------|-----------|
| `normal` | Commuter | 乘客 | Grey-blue | Idle drift / light resist |
| `stench` | Stench | 惡臭人 | Olive | Aura slows player in radius |
| `family` | Family | 一家大細 | Warm yellow | Cluster of 3–4; hard to split |
| `brat` | Brat | 屁孩 | Hot pink | Zigzag path, unpredictable |
| `couple` | Couple | 情侶 | Magenta pair | Occupies ~2 tiles; linked |
| `angry` | Angry man | 暴躁男 | Red | Periodic shove impulse on player |
| `luggage` | Luggage | 拉行李喼 | Brown + dark case | High mass; slows push heavily |

Future: tourist with map, influencer filming, elderly with cane, etc.

## Skill tree

- **+1 skill point** per level clear (first clear; replays can award 0 or fractional later).
- Three branches: **Strength (STR)** · **Speed (SPD)** · **Wisdom (WIS / INT)**.
- **60 points** to fill one branch (tiers), then **+10** to unlock that branch’s **ultimate** → **70** for full branch + ultimate.

### Branch fantasy

| Branch | Passive / actives | Ultimate (10 pts after fill) |
|--------|-------------------|------------------------------|
| STR | Push force, shove resist, stamina pool | **鐵牛撞門** — brief unstoppable charge |
| SPD | Move speed, stamina regen, dodge window | **閃身落車** — short dash through crowd |
| WIS | Read gaps, reduce aura/slow, tip icons | **人潮預測** — slow-mo path highlight |

v0.1: data-driven nodes; spending persisted in `localStorage`. Ultimates stubbed as timed buffs.

## Presentation

- **Mobile-first**, portrait preferred; Three.js WebGL.
- **Icon-first HUD**; text only where icons fail (station name, win/lose, skill labels).
- Look: MTR-inspired **red (#B01C2E) / white / silver**, line-colour accents, bilingual station strip.
- **No copyrighted MTR logos**; SVG/CSS/emoji/canvas originals only.

## Bilingual

`src/i18n/en.ts` + `zh-HK.ts`. Toggle persists. Prefer 粵 for flavour strings (逼落車, 十一煙花後…).

## Audio plan

| Cue | v0.1 | Target |
|-----|------|--------|
| Door open / close | Web Audio beep/whoosh placeholders | Licensed or original MTR-*style* chime |
| Arrival | Soft arpeggio placeholder | Same |
| Push / collide | Noise blip | Foleys |
| Win / lose | Major / minor sting | Polished stings |
| Ultimate | Rising whoosh | Distinct per branch |

**Do not rip** official MTR door/PA audio.

## Polish checklist (aspiration)

- [ ] Readable silhouette passenger types at phone distance
- [ ] Haptic ticks on shove (Capacitor)
- [ ] Onboarding: 3-beat gesture tutorial
- [ ] Safe-area insets / notch
- [ ] Reduced-motion mode
- [ ] Offline PWA cache
- [ ] Level select map with line colours
- [ ] Daily challenge seed
- [ ] Accessibility: colourblind passenger patterns
- [ ] App Store / Play via Capacitor (+ Apple Developer account)

## Tech notes

- Vite + TypeScript + Three.js
- Persist: `localStorage` key `hk-mtr-exit-rush-v1`
- Future: Capacitor shell; no secrets in repo
