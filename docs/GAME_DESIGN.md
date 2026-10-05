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

Player reaches the door zone (green floor marker: `z <= DOOR_Z + winDepth`, `|x| < winHalf`) before the timer expires. Progress bar fills as distance-to-door shrinks (milestone pings at 25/50/75%).

### Lose

- Timer hits 0 (doors close / announcement “請勿上落” vibe).
- Stamina hits 0 → **winded** (weak push, slow walk) until it recovers to 25%; boarders can sweep you back in.
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

v0.2: data-driven nodes; spending persisted in `localStorage`. Ultimates have real physical effects (see below), 10 s cooldown each.

## Physics & feel

All gameplay physics runs in a **pure-TypeScript sim** (`src/game/sim/`, no three.js) at a **fixed 60 Hz** with an accumulator; rendering interpolates between the last two steps. The same code runs headless in `npm run test:sim`, where a bot plays every level across seeds and skill profiles (checks NaNs, overlap, body cap, win rate, ms/step).

### Model

| Piece | How it works |
|-------|--------------|
| Bodies | Circles in the XZ plane with **mass**, velocity, linear **damping**, restitution, max speed. Cap **80 bodies** (player + passengers + suitcases). |
| Contacts | **Spatial hash grid** (0.9 m cells) → pairwise circle tests. **Soft positional correction** (fraction `contactBeta` per iteration, 3 iterations) lets the crowd **compress** under load and spring back; overlap past `hardOverlapFrac` is corrected rigidly (no tunnelling). A velocity **impulse** along the normal transfers momentum by inverse mass (light brats bounce off, luggage barely moves). |
| Static | Walls, longitudinal bench seats, grab pole, end wall with doorway, platform bounds, and door leaves that **slide shut physically** in the last `door.closeTime` seconds. |
| Riders | Spring to a standing spot (`anchorK`, capped at `anchorMax` × mass). Displaced too long → adopt a new spot (the crowd re-settles). Near the door they feel an inward **pressure field** while boarders stream in. They sidestep a little for the player (more with WIS). |
| Boarders (逼上車) | Spawn on the platform (a queue is waiting when the doors open), **funnel through the doorway**, then drive to a spot deep in the car with a desired-velocity controller capped at `boardMaxDrive` × mass — they push *against* you. Rate & total scale with level `pressure`. |
| Player | Desired-velocity drive (`accel`) capped at `maxDrive × pushForce × mass` — that cap **is** push-vs-resistance. Mass grows with STR `resist`. In contact you **shoulder** through: radius shrinks to `shoulderRadius` and a tangential **slip** force slides you along whoever blocks you. Stamina drains with contact pressure; 0 → winded. |
| Aim assist | 9-ray fan (±0.95 rad) scored by mass-weighted bodies & walls in each corridor; the stick direction blends toward the clearest one by `aim.base + gapSense × aim.perGapSense`. |
| Shove | Hold to charge (0.45 s), release for a cone burst: impulse to each body (radial + forward mix) scaled by charge × STR, a forward lunge, small recoil. Cost 9–20 stamina, 0.7 s cooldown. |

### Per-type behaviour

| Type | Physics |
|------|---------|
| normal | Baseline (mass 1, r 0.23). |
| brat | Light (0.5), bouncy, low anchor, lateral zigzag force + random darts. |
| luggage | Heavy owner (1.8, high damping) **plus a separate suitcase body** (2.6) on a stiff spring — blocks hard, you go around. |
| family | Adult + 2 kids; **cohesion force** toward the cluster centroid — hard to split, closes back up. |
| couple | Two bodies on a **damped spring** ("holding hands" link reddens under tension) — push between them and they pull back together. |
| angry | Heavy (1.6), strong drive. When you're close: 0.32 s wind-up (swell + red glow + grunt) → **knockback impulse** + short stun, barges neighbours. Shoving him makes him retaliate fast. 1 s i-frames after a hit. |
| stench | Aura slows you (green vignette, scaled by WIS `auraResist`) and **repels other passengers** — an obvious gap you pay for in speed. |

### Ultimates

| Ult | Effect |
|-----|--------|
| STR 鐵牛撞門 | Radial **shockwave** impulse (r 2.9 m, falls off, ÷ mass) + 2.2 s charge (mass ×3, drive ×2.2, immune to angry). Ring FX, big shake, hit-stop, white flash. |
| SPD 閃身落車 | **Dash** burst 6.2 m/s (toward the door if no stick), 1.1 s of speed ×2.1, mass ×3, slim radius. Afterimages + FOV punch. |
| WIS 人潮預測 | 3.5 s: crowd **hesitates** (AI forces −75%, no angry wind-ups), aim assist maxed, **gap path highlighted** through the crowd. |

### Juice

Camera: critically-damped follow with lag, trauma² shake, directional kicks, FOV punch (all ×0.3 under `prefers-reduced-motion`). Characters: squash/stretch springs on bumps, steady squish from contact pressure, lean into velocity, walk bob, hit flashes. Particles: pooled single-draw-call puffs (bumps, shove spray, stench clouds, sweat when winded, confetti on win). Hit-stop on big impacts. Vignettes: green (stench), red (door warning / angry hit), cyan (WIS). Door warning: last 5 s lights flash faster, beeps accelerate, exit marker flashes, leaves slide shut. Haptics: `navigator.vibrate` (guarded + throttled) on bumps, shoves, hits, ults, milestones.

### Tuning knobs

Everything lives in **`src/game/sim/tuning.ts`** (`TUNING`), grouped as `physics`, `car`, `player` (+ `stamina`, `shove`, `aim`), `crowd`, `types`, `ult`, `door`. Per-kind mass / radius / damping / anchor / drive / speed are in **`src/game/PassengerTypes.ts`**. In dev builds (or with `?debug`) `window.TUNING` is live-editable from the console. Re-run `npm run test:sim` after changes (`SEEDS=8`, `LEVEL=100` env vars).

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
- [x] Haptic ticks on shove (web `navigator.vibrate`; Capacitor later)
- [ ] Onboarding: 3-beat gesture tutorial
- [ ] Safe-area insets / notch
- [x] Reduced-motion mode (camera shake/kick scaled down)
- [ ] Offline PWA cache
- [ ] Level select map with line colours
- [ ] Daily challenge seed
- [ ] Accessibility: colourblind passenger patterns
- [ ] App Store / Play via Capacitor (+ Apple Developer account)

## Tech notes

- Vite + TypeScript + Three.js
- `src/game/sim/` = pure gameplay sim (fixed step, headless-testable); `src/game/*.ts` views read it
- Persist: `localStorage` key `hk-mtr-exit-rush-v1`
- Future: Capacitor shell; no secrets in repo
