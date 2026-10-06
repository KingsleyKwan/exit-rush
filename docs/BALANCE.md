# Balance — v0.7.0 (history below)

## v0.7.0 — 100 levels, 1 SP per clear, bosses

**Method:**

- `COUNTERS=0 LOADOUTS=earned RUNS=60 npm run test:sim`, run on every level.
- The "earned" build is what a player who first-cleared every earlier level would have: **id − 1 points at 1 SP per clear**, spent on the band's natural branch, with T3 counters once they're reachable.
- Seeds are deterministic: body and agent ids are reset per `Sim`, so results match for any `WORKERS` count.
- Levels 6–99 were tuned by `tune.py`, a timer/pressure/density search against the band midpoints. Boss timers are capped at 28 s with an 18 s floor.

**Result: every level 6–99 is inside its band (94/94).** L1–5 keep their v0.6 parameters. L5 sits at 93% against a ≥95% target, the same as v0.6.3 (bot noise on a 12 s normals-only level).

| Lv | Dens | Press | Sec | Earned clear | Band |
|---:|----:|-----:|----:|------:|------|
| 5 | 7 | 0.25 | 12 | 93% | ≥95% |
| 10 | 7 | 0.35 | 18 | 87% | 75–90% |
| 15 | 7 | 0.79 | 14 | 82% | 75–90% |
| 20 👑 | 8 | 0.47 | 20 | 65% | 55–75% |
| 25 | 9 | 0.65 | 16 | 60% | 55–75% |
| 30 👑 | 10 | 0.39 | 28 | 58% | 55–75% |
| 35 | 9 | 0.53 | 22 | 67% | 50–70% |
| 40 👑 | 9 | 0.35 | 28 | 53% | 50–70% |
| 45 | 9 | 0.63 | 23 | 65% | 50–70% |
| 50 👑 | 9 | 0.73 | 20 | 53% | 50–70% |
| 55 | 9 | 0.78 | 19 | 58% | 50–70% |
| 60 👑 | 9 | 0.98 | 18 | 68% | 50–70% |
| 65 | 10 | 0.82 | 15 | 40% | 35–60% |
| 70 👑 | 9 | 0.80 | 21 | 53% | 35–60% |
| 75 | 10 | 0.92 | 18 | 47% | 35–60% |
| 80 👑 | 9 | 0.98 | 17 | 40% | 35–60% |
| 85 | 9 | 0.91 | 14 | 45% | 35–60% |
| 90 👑 | 9 | 0.92 | 21 | 38% | 35–60% |
| 95 | 10 | 0.92 | 16 | 43% | 35–60% |
| 99 (exam) | 10 | 0.80 | 17 | 43% | 35–60% |

The v0.6.3 band misses (L10 30%, L16 40%, L22 33%, L23 3%, L24 17%, L27–30 13–32%) are all fixed.

**L100** (`RUNS=80`, density 8, pressure 0.90, 30 s, all eight kings):

| Build | Clear | Band |
|---|---:|---|
| 20-point | 0% | 0–5% |
| ult-str | 26% | 30–50% (just under; v0.6.3 was 12%) |
| ult-spd | 45% | 30–50% |
| ult-sta | 34% | 30–50% |

ult-str loses its time in the door/platform crush. Density 7 lifts it only to 29% while pushing ult-spd to 65%, and pressure and timer sweeps barely move it.

**Bosses**, with counter value measured in isolation: see [`BOSSES.md`](BOSSES.md).

**Economy note:** at 1 SP per first clear, the T3 counters (40/50/60 points in a branch) aren't reachable on a first attempt at L20–L50, so the early kings are tuned to be worn down without them. Counters pay off on replays, via free respec and the three loadouts, and from L60 on.

**Determinism fix:** results used to differ between `WORKERS` counts and test order, because body and agent id counters leaked across sims and shifted wander phases. `Sim` now calls `resetBodyIds()` and `resetAgentIds()`. The old *Thread (couple)* micro-test only passed through that leak. It now measures Thread directly: the pair opens 0.49 → 0.87 m and crossing time drops 1.58 → 1.40 s.

---

# Balance — v0.6.0

Short-session retune: timers ≈ **12–18 s** (L100 **24 s**), staged specials, first-clear SP economy. Physics knobs in `src/game/sim/tuning.ts` are largely unchanged from v0.2.1; **level table** and **points** changed.

## Skill points (v0.5–v0.6 rule)

| Rule | Value |
|------|-------|
| Points on **first** clear of a level | **3** (`POINTS_PER_FIRST_CLEAR`) |
| Points on replay | **0** (temporary 5-per-level replay cap **removed**) |
| Playable levels | 1–30 + 100 = **31** |
| Max SP from content | 31 × 3 = **93** |
| Full branch + ultimate | 60 + 10 = **70** |

L100 is tuned for a strong build (~70–93 pts, ideally one ultimate). With only first-clear awards, grinding replays no longer farms SP — clear new stations instead.

## Targets (bot, earned ≈ id−1 pts spread)

| Band | Win rate (earned) | Median clear (bot) |
|------|-------------------|--------------------|
| L1–5 | ≥ 95 % | ≈ 4–9 s (humans slower → ~6–10 s) |
| L6–15 | 75–95 % | ≈ 7–12 s |
| L16–30 | 55–85 % | ≈ 10–16 s |
| L100 @ ~20 pts | 0–10 % | — |
| L100 @ ~90 pts + ult | 30–55 % | ≈ 14–20 s |

Humans are slower than the bot; door-beep tension should remain.

## How to rerun

```bash
npm run test:sim
RUNS=40 npm run test:sim
RUNS=40 LEVEL=1,5,6,12,21,30,100 LOADOUTS=none,earned,ult-spd npm run test:sim
```

## Changelog vs v0.4.1

- Timers cut from ~36–50 s → ~12–18 s (L100 28→24).
- L1–5 normals only; intros at 6/9/12/15/18/21.
- SP: 3 on first clear, no replay farm.
- L100 gated behind clear of L30.


## Skill tree (v0.6)

Constellation redesign: see [`SKILL_TREE.md`](SKILL_TREE.md). Wisdom → **Stamina**. Continuous fill still scales soft stats; major nodes unlock at 10/20/30/40/50/60. Tier 3 (v0.6.2) = counters to special passengers (see SKILL_TREE.md); only reachable with 40+ in a branch, i.e. endgame / L100 builds.

v0.6.2 L100 check (`COUNTERS=0 LEVEL=100 RUNS=120`, main → v0.6.2): pts20 3% → 3%, ult-str 3% → 6%, **ult-spd 38% → 47%** (target 30–50%), ult-sta 6% → 8%. Hurdle was the big lever (passing owners too gave ~90%); it now hops suitcases only at ×0.7 pace, Leap cd 6 s. ult-str / ult-sta were already below band on main.

L8 introduces **踎低 / squat** (hard shove, lateral weave). Bot win-rate on L8 may sit below the L6–15 band until further tuning.


## Crowd density (v0.6)

- `crowdCount` ≈ `7 + density·3.6` (was `6 + density·3.2`).
- Level densities +1 in most bands; L1–5 stay teachable (~6–7).
- Boarding: higher `boardRate*` / `boardQueue*` / `boardBudget*`; `maxBodies` 96.
- Benches: margin 0.06, fill 96% of between-bay segment (sim + TrainScene matched).

## v0.6.3 — 大聲公 Loudmouth

Bot clear rates (`COUNTERS=0 RUNS=60`, earned loadout; v0.6.2 → v0.6.3). The bot walks straight through noise zones, so it's a pessimistic read; players can route round them.

| Lv | v0.6.2 | v0.6.3 | Note |
|---:|------:|------:|------|
| 25 | 60% | 58% | no loudmouth (noise only) |
| 26 | 40% | **68%** | now the loudmouth intro (was Mix exam C), timer 19 s; target 55–75% |
| 27 | 17% | 20% | + loudmouth weight 1 |
| 28 | 28% | 32% | unchanged level |
| 29 | 28% | 28% | + loudmouth 0.8 |
| 30 | 12% | 13% | + loudmouth 0.8 |

L100 (`RUNS=120`): pts20 3% → 3%, ult-str 6% → 12%, ult-spd 47% → 51% (same 200 seeds: 51% on v0.6.2 vs 53%), ult-sta 8% → 11%. L27–30 were already under band in v0.6.2 and stay there; this release doesn't make them harder.

First pass (zone r 1.6 m, weight 4, boarders allowed) dropped L26 to 2%: about 10 loudmouths blanketed a car only ~4 m wide, and boarding loudmouths parked their zone on the door. Fixed with rider-only loudmouths, ~3 per intro car, r 1.3 m, a steep falloff (8% at the rim) and no stacking. Intro L26 then guarantees ≥2 loudmouths (normal riders >1.6 m from the start are swapped in), which cost ~20 pts of clear rate at 17 s, so the L26 timer went 17 → 19 s (earned 38% → 68%).
