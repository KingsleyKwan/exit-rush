# Balance

> v0.4.1 retune note: exits moved to **left-wall side doors**; bot aims −X toward `openDoorBays`. Win rates below may shift until a fresh RUNS=40 pass.
 — v0.2.1

v0.2.1 is a balance pass driven by the headless sim (`scripts/simTest.ts`). A bot
(stick toward the doorway with a weave, charged shove when blocked, sidestep when
stuck, ults when sensible, follows the WIS path) stands in for a *decent* player.
Humans are slower than the bot, so real clear times run longer than the table.

## Targets

| | Target (bot, level-appropriate points = id − 1) |
|---|---|
| L1–5 | win ≥ 95 %, L1 clear ≈ 15–25 s with a comfortable margin |
| L6–15 | win 75–90 % |
| L16–20 | win 55–75 % |
| L100 | ~99 pts incl. one ultimate (60 + ult + 15/14): win 30–50 % · 20 pts: 0–5 % |
| all | clear times grow with level; almost no clears under 10 s after L1 |

## Results (before → after)

Same harness and bot for both columns (before = v0.2.0 code). 64 runs per row,
`SEED=20000`; “earned” = id − 1 points spread STR/SPD/WIS round-robin.
Median clear time / time left are over wins only.

### By band

| Band | Loadout | Before: win · med clear · med left · clears < 10 s | After: win · med clear · med left · clears < 10 s |
|---|---|---|---|
| L1 | earned | 100 % · 4.0 s · 56.0 s · 100 % | 100 % · 13.9 s · 22.1 s · 12 % |
| L1–5 | earned | 100 % · 4.6 s · 45.9 s · 99 % | 97.5 % · 14.0 s · 23.4 s · 12 % |
| L1–5 | none | 100 % · 4.6 s · 45.8 s · 98 % | 97.2 % · 14.4 s · 22.9 s · 10 % |
| L6–15 | earned | 99.2 % · 5.9 s · 33.4 s · 86 % | 80.9 % · 18.4 s · 21.4 s · 4 % |
| L6–15 | none | 97.3 % · 6.8 s · 32.3 s · 75 % | 77.2 % · 20.7 s · 19.5 s · 2 % |
| L16–20 | earned | 92.5 % · 7.1 s · 24.2 s · 70 % | 73.8 % · 21.5 s · 21.8 s · 2 % |
| L16–20 | none | 79.4 % · 9.0 s · 23.2 s · 46 % | 50.9 % · 25.3 s · 17.7 s · 0 % |

### Level 100 (Dun Sha Mouth / 頓沙嘴 after fireworks)

| Build | Before (timer 22 s) win · med clear | After (timer 23 s) win · med clear |
|---|---|---|
| 20 pts (spread) | 63 % · 9.1 s | **0 %** |
| 19 pts (“earned” at L20) | 45 % · 8.8 s | 0 % |
| 40 pts (spread) | – | 0 % |
| 99 pts, no ult (33/33/33) | 100 % · 4.1 s | 24 % · 16.5 s |
| 99 pts STR ult (60+ult / 15 / 14) | 100 % · 4.4 s | **40 %** · 17.6 s |
| 99 pts SPD ult | 100 % · 4.2 s | **55 %** · 17.3 s ² |
| 99 pts WIS ult | 100 % · 4.2 s | **44 %** · 14.8 s |

After: 80 runs, `SEED=15000`. ² Across three seed sets the SPD build scored
39 / 42 / 55 %, STR 33 / 36 / 40 %, WIS 34–44 % — the three ultimates sit within noise of each other.

### Per level

| Lv | Before timer | Before earned (win · med clear) | After density / pressure / timer | After none | After earned |
|---|---|---|---|---|---|
| 1 | 60 s | 100% · 4.0 s | 10 / 0.15 / 36 s | 98% · 13.2 s | 100% · 13.9 s |
| 2 | 55 s | 100% · 4.7 s | 6 / 0.2 / 38 s | 100% · 13.6 s | 97% · 12.8 s |
| 3 | 50 s | 100% · 4.1 s | 10 / 0.35 / 37 s | 97% · 13.8 s | 98% · 13.2 s |
| 4 | 48 s | 100% · 5.2 s | 8 / 0.3 / 37 s | 95% · 16.3 s | 97% · 16.0 s |
| 5 | 45 s | 100% · 5.6 s | 5 / 0.6 / 40 s | 95% · 15.6 s | 95% · 13.9 s |
| 6 | 44 s | 100% · 5.7 s | 6 / 0.3 / 36 s | 86% · 17.5 s | 89% · 17.4 s |
| 7 | 46 s | 100% · 5.9 s | 9 / 0.3 / 37 s | 73% · 22.1 s | 78% · 19.4 s |
| 8 | 42 s | 100% · 5.6 s | 8 / 0.6 / 39 s | 75% · 18.1 s | 81% · 17.0 s |
| 9 | 40 s | 100% · 5.7 s | 8 / 0.6 / 40 s | 78% · 22.2 s | 80% · 19.8 s |
| 10 | 38 s | 97% · 9.0 s | 8 / 0.4 / 40 s | 80% · 20.7 s | 88% · 18.0 s |
| 11 | 40 s | 97% · 5.3 s | 7 / 0.2 / 41 s | 75% · 23.8 s | 78% · 21.5 s |
| 12 | 39 s | 100% · 5.3 s | 6 / 0.55 / 39 s | 77% · 19.5 s | 80% · 16.8 s |
| 13 | 36 s | 100% · 5.9 s | 9 / 0.85 / 42 s | 92% · 19.3 s | 88% · 17.3 s |
| 14 | 34 s | 98% · 8.7 s | 8 / 0.6 / 45 s | 69% · 21.5 s | 78% · 20.1 s |
| 15 | 35 s | 100% · 5.8 s | 9 / 0.9 / 48 s | 67% · 22.6 s | 70% · 17.9 s ¹ |
| 16 | 37 s | 100% · 7.4 s | 8 / 0.65 / 40 s | 53% · 26.5 s | 73% · 22.9 s |
| 17 | 33 s | 97% · 6.5 s | 7 / 0.8 / 37 s | 50% · 17.9 s | 81% · 17.6 s ¹ |
| 18 | 32 s | 100% · 7.1 s | 8 / 0.75 / 45 s | 55% · 26.7 s | 70% · 22.3 s |
| 19 | 30 s | 66% · 10.4 s | 7 / 0.6 / 45 s | 48% · 28.1 s | 70% · 21.2 s |
| 20 | 28 s | 100% · 6.0 s | 10 / 0.8 / 50 s | 48% · 25.0 s | 73% · 22.5 s |

¹ L15 and L17 timers were nudged after this run (46 → 48 s, 38 → 37 s); a 96-run
re-check (`SEED=30000`) gave L15 83 % and L17 69 %.

### Skill-point scaling (19 points, 64 runs)

| Level | 0 pts | 19 spread | 19 STR | 19 SPD | 19 WIS |
|---|---|---|---|---|---|
| L10 | 77 % | 83 % | 81 % | 88 % | 91 % |
| L20 | 48 % | 75 % | 61 % | 78 % | 75 % |

Points matter (≈ +1.4 % win per point at L20) but 19 points don't trivialise
anything. STR is the weakest branch at low investment and the strongest at a full
branch, because push force and mass multiply.

## What changed

**Physics / feel (`src/game/sim/tuning.ts`)**
- **Crowd drag** (new, `player.crowdDrag`): top speed drops with nearby bodies
  (weighted by distance, up to −65 %). WIS `gapSense` cuts it (full WIS ≈ −40 %
  drag); the SPD dash keeps half of it. Before this, the crowd hardly slowed you
  unless boarders jammed the door, so every level was either a 4 s walk or a jam.
- `player.maxSpeed` 2.0 → 1.5 m/s (free walking still feels brisk; crowds are a shuffle).
- `player.massPerResist` 1.6 → 1.0 (STR's mass bonus multiplied with push force).
- Boarding: `boardBudgetBase` 3 → 8, `boardBudgetPerPressure` 28 → 16,
  `boardQueueBase` 2 → 5, `boardQueuePerPressure` 7 → 5. Even early levels get a
  small wave at the door, and high-pressure levels overfill (permanent jams) less often.

**Skill passives** (coefficients moved into `TUNING.skills`; save format unchanged)
- STR push force at a full branch +85 % → +60 %; SPD move speed +70 % → +45 %.
  The rest is unchanged (stamina, resist, aura resist, gapSense).

**Ultimates** (shared 10 s cooldown unchanged)
- **SPD dash, toned down:** burst 6.2 → 5.5 m/s, duration 1.1 → 1.0 s, speed ×2.1 → ×1.7,
  mass ×3 → ×2.2, and it now keeps 50 % of crowd drag. Before, one dash at t ≈ 2 s
  cleared any level, L100 included (~4 s median).
- STR charge: impulse 7.5 → 5.5, charge 2.2 → 1.6 s, mass ×3 → ×2.2, drive ×2.2 → ×1.8.
- WIS sense: 3.5 → 3.0 s, calm 0.75 → 0.65.

**Levels (`src/game/levels.ts`)**: every density, pressure and timer was retuned
(see the table). Difficulty is composite: luggage-heavy levels (2, 6, 11, 12, 19)
use lower density because suitcases are extra heavy bodies, and boarding-wave
levels trade density for pressure. Timers now *rise* gently (36 → 50 s) because
clear times rise faster; the timer-to-clear ratio tightens with level.
**L100**: density 10, pressure 1.0 → **1.6** (an event-level surge, above the
regular 0–1 range), mix shifted to angry/luggage-heavy (still families, couples,
stench, a brat), timer 22 → 23 s.

## How to rerun

```bash
npm run test:sim                                   # quick sanity (RUNS=6): fails only on NaN / body cap / overlap
RUNS=64 npm run test:sim                           # balance-grade: none + earned on 1–20; pts20 + 3 ult builds on 100
RUNS=64 LEVEL=100 LOADOUTS=pts20,pts99-noult,ult-str,ult-spd,ult-wis npm run test:sim
RUNS=64 LEVEL=10,20 LOADOUTS=none,earned,earned-str,earned-spd,earned-wis npm run test:sim
```

Env knobs: `RUNS` (alias `SEEDS`), `LEVEL=1,5,100`, `LOADOUTS=…` (`none`, `earned`,
`earned-str|spd|wis`, `pts20`, `pts40`, `pts99-noult`, `ult-str|spd|wis`, `max`, or ad-hoc
`b:STR/SPD/WIS[+str|+spd|+wis]`, e.g. `b:60/15/14+spd`), `SEED` (offset), `WORKERS`
(threads, default 8), `JSON=out.json` (rows with sorted clear times and loss positions),
`TUNE='{"ult":{"spd":{"burst":5}}}'` (deep-merged into TUNING), and
`PATCH='{"1":{"density":9,"timer":40}}'` (per-level overrides). `DUMP=1` prints the crowd
around the player on every loss. The table prints win %, median clear time, median time
left, % of runs cleared in under 10 s, and an `ok/off` mark against the target band.

Expect about ±6 % win-rate noise at 64 runs; compare changes with the same `SEED`.

## Still off / next

- L1 median ≈ 14 s for the bot, a hair under the 15 s floor. Humans will be slower, so it was left as is.
- Distributions are heavy-tailed: a loss is usually a jam (the car overfills with
  boarders), not a near miss. Playtest whether that feels fair, or whether boarders
  should give up sooner (`crowd.boardMaxTime`).
- At 99 points, a balanced build with no ultimate (33/33/33) still wins L100 about
  20–25 % of the time, so it is not as punishing as no points.
- STR is weak at low investment and strong when full (multiplicative). A per-point
  curve (e.g. `t^0.8`) could even that out.
- Tuned against the bot only. Human playtests should confirm the L1–5 margin and the
  L16–20 tension.
