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

Constellation redesign: see [`SKILL_TREE.md`](SKILL_TREE.md). Wisdom → **Stamina**. Continuous fill still scales soft stats; major nodes unlock at 10/20/30/40/50/60. Tier 3 numbers are **TBD placeholders**.

L8 introduces **踎低 / squat** (hard shove, lateral weave). Bot win-rate on L8 may sit below the L6–15 band until further tuning.


## Crowd density (v0.6)

- `crowdCount` ≈ `7 + density·3.6` (was `6 + density·3.2`).
- Level densities +1 in most bands; L1–5 stay teachable (~6–7).
- Boarding: higher `boardRate*` / `boardQueue*` / `boardBudget*`; `maxBodies` 96.
- Benches: margin 0.06, fill 96% of between-bay segment (sim + TrainScene matched).
