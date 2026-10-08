# Skill tree — v0.7.0 constellation

Assassin’s Creed Valhalla–style **constellation**: three coloured arms from a centre hub (**力量 Strength** · **速度 Speed** · **體力 Stamina**). Wisdom (智慧) was **replaced by Stamina** in v0.6; old saves migrate `wis` / `ultWis` → `sta` / `ultSta`.

## Economy (v0.8.1)

| Rule | Value |
|------|-------|
| Skill point | **1 per 10 first clears** (`LEVELS_PER_SKILL_POINT`). Replays award **0**. |
| Max from content | 100 levels → **10** points |
| One skill | **1 point**. Power lands on the next node: 10 / 20 / 30 / 40 / 50 / 60. Branch power still tops out at **60** (`BRANCH_FILL`). |
| Ultimate | **1 point** after the branch is full. Power stays 60; the ultimate is a flag. |
| Full branch + ult | **7** points (6 skills + ultimate). Reachable once 70 levels are first-cleared, same as before. |
| What 10 points buy | that, plus **3** skills on other branches |
| Respec | **Free and instant**: refunds every skill (incl. ultimates) in the active build, after a confirm dialog |
| Loadouts | **3 builds** (配點1/2/3), each its own allocation of the **same** earned total; switch from the skill tree, level select or result card; applies from the next run |

Hint line under the tree title: 「每 10 關得 1 點。每個技能用 1 點。」 / "Every 10 levels earns 1 point. Each skill costs 1."

The learn button on each arm spends 1 point and names the next skill. Tapping a node only shows its effect.

**Points are derived, not stored.** On load, spare points are *earned − skills bought*. Earned is `floor(distinct first clears / 10)`. Each 10 power in a branch is one skill; an ultimate is one skill. Power left over below the next 10 (an old save) is kept until respec and does not count as an extra skill. If a build bought more skills than it now earns, that build is **fully refunded**, and the one-time notice 「技能點已重新計算 — 請重新配點 / Skill points recalculated — please re-allocate」 shows.

A first-time player facing a boss has `floor((level − 1) / 10)` points: L20 → 1, L40 → 3, L60 → 5, L80 → 7. Spending every point on one branch still reaches power 40 at L41, power 50 at L51, and power 60 at L61, so the early kings are still worn down without their T3 counters (see [`BOSSES.md`](BOSSES.md)).

The balance bot's "earned" spread is still one point of **branch power** per earlier level. That fixture is not this currency. Do not retune it so the win-rate bands match the new point count.

Per branch: **4 passive + 2 active + 1 ultimate** (6 major skills + ult).

## Node map

### 力量 Strength (orange)

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `str_t1` | Passive | 力量 ×1.1 |
| 20 | `str_t2a` | Passive | Extra push when contact is in front |
| 30 | `str_t2b` | Active-feel | Hold ~1s charge → shove hits harder |
| 40 | `str_t3a` | Passive · counters **Couple** | **拆散情侶 Split** — a shove hit on a couple breaks their hand-hold for 4 s and pops them apart |
| 50 | `str_t3b` | Active (full-charge shove) · counters **Luggage** | **震地 Ground Pound** — radial shockwave (r 1.6 m); suitcases take ×2.6 so they actually move |
| 60 | `str_t3c` | Passive · counters **Angry man** | **頂硬上 Stand Firm** — angry shove impulse ×0.15, stagger ×0.15 |
| ult | Ult | **鐵牛撞門** Iron Bull Charge | Shockwave + brief charge (unchanged fantasy) |

### 速度 Speed (cyan)

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `spd_t1` | Passive | 速度 ×1.1 |
| 20 | `spd_t2a` | Passive | Faster when unobstructed |
| 30 | `spd_t2b` | Passive | Less speed loss when blocked |
| 40 | `spd_t3a` | Passive · counters **Luggage** | **跨行李 Hurdle** — no contact with suitcases (they don't block, slow or steer your aim); short 0.32 s hop while passing, at ×0.7 top speed. The owner is still a normal body |
| 50 | `spd_t3b` | Active (HUD, 6 s cd) · counters **Squatter**, **Family kids** | **飛身 Leap** — 0.55 s leap burst; no contact with squatters or family kids while airborne, no squat weave drag. Replaces Brief Dash |
| 60 | `spd_t3c` | Passive · counters **Couple** | **穿插 Thread** — when you're at the gap between a couple, they let go and step apart |
| ult | Ult | **閃身落車** Slip-Off Dash | Burst dash (kept) |

Continuous SPD fill also feeds **gapSense** (aim assist / crowd yield / drag cut) — moved off the old Wisdom branch.

### 體力 Stamina (green) — was Wisdom

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `sta_t1` | Passive | 體力 ×1.1 (max pool) |
| 20 | `sta_t2a` | Passive | Stamina regen up |
| 30 | `sta_t2b` | Passive | Start with extra **non-regen buffer** |
| 40 | `sta_t3a` | Passive · counters **Stench** | **忍臭 Hold Breath** — stench aura slow fully ignored |
| 50 | `sta_t3b` | Active (HUD, 12 s cd) · counters **Brat** | **回魂 Second Wind** — +45 stamina, clears winded; knocks brats within 1.6 m away and dazes them (no darting) for 3 s |
| 60 | `sta_t3c` | Passive · counters **Family**, **Loudmouth** | **好脾氣 Unbothered** — pushing against family members costs no stamina and they add no crowd drag; 大聲公 noise-zone drain ×0.3 (−70%, v0.6.3) |
| ult | Ult | **鐵馬企穩** Iron Stance | Burst regen + heavy mass + light crowd calm (**replaces** 人潮預測 Crowd Sense path highlight) |

## Tier 3 = special-passenger counters (v0.6.2, approved)

Each Tier 3 node counters one special passenger type; the node shows that type's icon on its corner and the detail tray lists "Counters / 剋制" with the type chip(s). Node ids are unchanged (`*_t3a/b/c`), so saves stay valid. Ultimates are unchanged.

**Adapted to the real sim mechanics** (where the brief described something that doesn't exist):

- **Brat (百厭仔) doesn't cling** — it zig-zags and darts. Second Wind instead *knocks nearby brats away and dazes them* (no zig-zag/darts) for 3 s.
- **Family doesn't drain stamina on its own** — stamina drains from pushing into any crowd. Unbothered removes the drain *from the share of your contacts that are family members*, and family bodies add no crowd drag.
- **Stench only slows** (no drain) — Hold Breath makes the slow zero.
- **Ground Pound** stays a full-charge-shove shockwave (as before), now with a luggage multiplier.
- **Hurdle** hops the *suitcase* only; the owner still blocks like any rider. Passing owners too pushed L100 ult-spd to ~90% clear, so it was narrowed and each hop costs a little pace (×0.7 top speed for 0.32 s). Leap cooldown is 6 s (brief didn't fix a number).

Implementation: pass-through uses per-body `passTag` / `passMask` bits in `Physics.ts` (`PASS_LUGGAGE`, `PASS_SQUAT`, `PASS_KID`) — the contact solver skips matching pairs. Couple split / thread live in `CrowdSim.applyLinks`; brat daze in `CrowdSim.shakeOffBrats`. Tests: `npm run test:sim` runs one scripted micro-scenario per counter (with vs. without the node) before the balance table.

Tune numbers in `TUNING.skills` (`src/game/sim/tuning.ts`). Node copy lives in `src/game/SkillTree.ts`.

## UI

- Constellation hub shows spare points; each arm has small nodes + larger major/ult icons.
- EN + 粵 labels; icon-first; spend button on each arm head.
- In-run overlay: changes apply next run (same as before).

## Migration

`normalizeSave` maps legacy `skills.wis` → `sta` and `ultWis` → `ultSta` when the new fields are absent.


## v0.8 Mage spellbook
凱婷 does not use the hero constellation. Her book is three chains — wind, ice, gravity — read from the bottom. A skill needs the one below it. Only one of the three last skills can be learned. The schools mix: wind blows, wind + ice sends people another way, ice + gravity holds them still. The list is `docs/CHARACTERS.md` §3 and `src/game/SpellTree.ts`. `str` / `spd` / `sta` stay the hero's power fields.
