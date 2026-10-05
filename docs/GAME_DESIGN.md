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
| `brat` | Brat | 百厭仔 | Hot pink | Zigzag path, unpredictable |
| `couple` | Couple | 情侶 | Magenta pair | Occupies ~2 tiles; linked |
| `angry` | Angry man | 暴躁男 | Red | Periodic shove impulse on player |
| `luggage` | Luggage | 拉行李喼 | Brown + dark case | High mass; slows push heavily |

Future: tourist with map, influencer filming, elderly with cane, etc.

## Skill tree

- **+1 skill point** per level clear. v0.2.2 stop-gap while only 21 levels exist: replays also award +1, capped at **5 points per level** (`MAX_POINTS_PER_LEVEL`), so the ~99-point L100 loadout is reachable; drop the cap to 1 once levels 21–99 ship.
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
| Player | Desired-velocity drive (`accel`) capped at `maxDrive × pushForce × mass` — that cap **is** push-vs-resistance. Mass grows with STR `resist`. **Crowd drag** (v0.2.1): top speed shrinks with nearby bodies (`player.crowdDrag`, max −65%; WIS cuts it) so packed cars are a shuffle, not a sprint. In contact you **shoulder** through: radius shrinks to `shoulderRadius` and a tangential **slip** force slides you along whoever blocks you. Stamina drains with contact pressure; 0 → winded. |
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
| STR 鐵牛撞門 | Radial **shockwave** impulse (r 2.9 m, 5.5, falls off, ÷ mass) + 1.6 s charge (mass ×2.2, drive ×1.8, immune to angry). Ring FX, big shake, hit-stop, white flash. |
| SPD 閃身落車 | **Dash** burst 5.5 m/s (toward the door if no stick), 1.0 s of speed ×1.7, mass ×2.2, slim radius, keeps half the crowd drag. Afterimages + FOV punch. (v0.2.1: toned down from 6.2 m/s / 1.1 s / ×2.1 / ×3 / no drag.) |
| WIS 人潮預測 | 3.0 s: crowd **hesitates** (AI forces −65%, no angry wind-ups), aim assist maxed, **gap path highlighted** through the crowd. |

### Juice

Camera: critically-damped follow with lag, trauma² shake, directional kicks, FOV punch (all ×0.3 under `prefers-reduced-motion`). Characters: squash/stretch springs on bumps, steady squish from contact pressure, lean into velocity, walk bob, hit flashes. Particles: pooled single-draw-call puffs (bumps, shove spray, stench clouds, sweat when winded, confetti on win). Hit-stop on big impacts. Vignettes: green (stench), red (door warning / angry hit), cyan (WIS). Door warning: last 5 s lights flash faster, beeps accelerate, exit marker flashes, leaves slide shut. Haptics: `navigator.vibrate` (guarded + throttled) on bumps, shoves, hits, ults, milestones.

### Tuning knobs

Everything lives in **`src/game/sim/tuning.ts`** (`TUNING`), grouped as `physics`, `car`, `player` (+ `stamina`, `shove`, `aim`, `crowdDrag`), `crowd`, `types`, `skills` (skill-tree passive coefficients), `ult`, `door`. Per-kind mass / radius / damping / anchor / drive / speed are in **`src/game/PassengerTypes.ts`**. In dev builds (or with `?debug`) `window.TUNING` is live-editable from the console. Re-run `npm run test:sim` after changes (`RUNS=40`, `LEVEL=1,100`, `LOADOUTS=earned,ult-spd`, `TUNE='{…}'`, `PATCH='{…}'` env vars — see [`BALANCE.md`](BALANCE.md)).

## Presentation

- **Mobile-first**, portrait preferred; Three.js WebGL.
- **Icon-first HUD**; text only where icons fail (station name, win/lose, skill labels).
- Look: MTR-inspired **red (#B01C2E) / white / silver / navy**, line-colour accents, bilingual station strip.
- **No copyrighted MTR logos**; SVG/CSS/canvas originals only.

### Art direction (v0.3.0)

- **Style target:** chunky chibi low-poly — big heads, small bodies, flat shading, saturated per-type colours. Concept lineup, app icon and key art were **generated with Grok Image** and processed by `scripts/art/build_art.py` (icons, WebP key art, portrait strip, store capsules).
- **Characters** (`src/game/characters.ts`): every look is one merged, vertex-coloured, flat-shaded geometry (head, face, hair, torso, arms, legs, props) → one `InstancedMesh` per look, so 80 bodies cost ~15 draw calls. Readability from the top-down camera comes from hats / hair / shoulder colour and props:

| Type | Colour | Silhouette cues |
|------|--------|-----------------|
| Hero | blue shirt | lanyard, cyan glow shell + x-ray outline, ring |
| Commuter | grey hoodie (+ 5 variants) | phone in hand, head down |
| Stench | yellow singlet | wavy green stink lines + flies (High) |
| Family | orange mum + 2 kids | three bodies on one disc |
| Brat 百厭仔 | pink cap | small, bouncy, tongue out |
| Couple | matching magenta | joined hands link, floating heart |
| Angry 暴躁男 | red polo | anger vein, red tint + steam during wind-up |
| Tourist | teal shirt, sun hat | camera, big brown suitcase |

- **Type icons:** small round billboards (same glyphs as the legend) over special passengers within ~3.4 m of the player, plus any angry man winding up; toggle in settings.
- **Car:** white walls, red stripe, stainless longitudinal benches, glass partitions, poles + overhead rails with red grips, red door frame with indicator lights, line-map strip above the door, yellow edge line, PSDs, red/white tiled pillars, navy bilingual station sign (level `stationEn` / `stationZh`, with an "inspired look · not affiliated" note). Static meshes merged per material.
- **UI:** authored SVG icon set (`src/ui/icons.ts`), bold rounded filled glyphs; title over key art; level cards = number badge + line dots + station 中/EN + density/timer icons; passenger legend with concept portraits.
- **Quality:** Low drops stink lines/flies/most puffs and the shadow map; High keeps everything.

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

- [x] Readable silhouette passenger types at phone distance (v0.3 chibi looks + type icons)
- [x] Haptic ticks on shove (web `navigator.vibrate`; Capacitor later)
- [ ] Onboarding: 3-beat gesture tutorial
- [x] Safe-area insets / notch (v0.2.2) · 44 px touch targets
- [x] Reduced-motion mode (camera shake/kick scaled down)
- [ ] Offline PWA cache
- [x] Level select with line colours (v0.3 cards; full map TBD)
- [ ] Daily challenge seed
- [ ] Accessibility: colourblind passenger patterns
- [ ] App Store / Play via Capacitor (+ Apple Developer account)

## Tech notes

- Vite + TypeScript + Three.js
- `src/game/sim/` = pure gameplay sim (fixed step, headless-testable); `src/game/*.ts` views read it
- Persist: `localStorage` key `hk-mtr-exit-rush-v1` (v0.2.2: never throws — in-memory fallback + one-time toast when storage is blocked; new fields `clears`, `quality`, `autoQuality` default safely for old saves)
- Graphics quality (v0.2.2): Auto / Low / High — see `src/game/quality.ts`. Low = no shadow map, no antialias, pixel ratio 1; Auto = device hints + FPS probe (cached)
- Lifecycle (v0.2.2): `visibilitychange` / `pagehide` / `blur` auto-pause the run; AudioContext suspended while hidden
- Future: Capacitor shell; no secrets in repo
