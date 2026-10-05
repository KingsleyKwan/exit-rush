# Skill tree — v0.6 constellation

Assassin’s Creed Valhalla–style **constellation**: three coloured arms from a centre hub (**力量 Strength** · **速度 Speed** · **體力 Stamina**). Wisdom (智慧) was **replaced by Stamina** in v0.6; old saves migrate `wis` / `ultWis` → `sta` / `ultSta`.

## Economy

| Rule | Value |
|------|-------|
| Points on **first** clear | **3** |
| Replay | **0** |
| Branch fill | **60** |
| Ultimate after fill | **+10** |
| Full branch + ult | **70** |
| Major skill icons | every **~10** points (10 / 20 / 30 / 40 / 50 / 60) |

Per branch: **4 passive + 2 active + 1 ultimate** (6 major skills + ult).

## Node map

### 力量 Strength (orange)

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `str_t1` | Passive | 力量 ×1.1 |
| 20 | `str_t2a` | Passive | Extra push when contact is in front |
| 30 | `str_t2b` | Active-feel | Hold ~1s charge → shove hits harder |
| 40 | `str_t3a` | Passive **TBD** | Wider shove cone 「第三層暫定」 |
| 50 | `str_t3b` | Active **TBD** | Full-charge **Ground Pound** shockwave |
| 60 | `str_t3c` | Passive **TBD** | Knockback ×1.25 |
| +10 | Ult | **鐵牛撞門** Iron Bull Charge | Shockwave + brief charge (unchanged fantasy) |

### 速度 Speed (cyan)

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `spd_t1` | Passive | 速度 ×1.1 |
| 20 | `spd_t2a` | Passive | Faster when unobstructed |
| 30 | `spd_t2b` | Passive | Less speed loss when blocked |
| 40 | `spd_t3a` | Passive **TBD** | Afterimage on dash 「第三層暫定」 |
| 50 | `spd_t3b` | Active **TBD** | **Brief Dash** (HUD button when unlocked) |
| 60 | `spd_t3c` | Passive **TBD** | Stronger weave slip |
| +10 | Ult | **閃身落車** Slip-Off Dash | Burst dash (kept) |

Continuous SPD fill also feeds **gapSense** (aim assist / crowd yield / drag cut) — moved off the old Wisdom branch.

### 體力 Stamina (green) — was Wisdom

| At | Id | Kind | Effect |
|----|----|------|--------|
| 10 | `sta_t1` | Passive | 體力 ×1.1 (max pool) |
| 20 | `sta_t2a` | Passive | Stamina regen up |
| 30 | `sta_t2b` | Passive | Start with extra **non-regen buffer** |
| 40 | `sta_t3a` | Passive **TBD** | Stronger stench aura resist 「第三層暫定」 |
| 50 | `sta_t3b` | Active **TBD** | **Second Wind** burst restore (HUD) |
| 60 | `sta_t3c` | Passive **TBD** | Less drain while pushing |
| +10 | Ult | **鐵馬企穩** Iron Stance | Burst regen + heavy mass + light crowd calm (**replaces** 人潮預測 Crowd Sense path highlight) |

## Tier 3 proposals (for Kingsley approval)

UI tip / docs mark Tier 3 as **「第三層暫定」**. Suggested finals:

- **STR:** wider cone + knockback passives; Ground Pound active (wired with defaults).
- **SPD:** afterimage passive; Brief Dash active; weave slip passive.
- **STA:** shrug-off stench; Second Wind active; iron lungs (drain resist).

Tune numbers in `TUNING.skills` / `TUNING.ult.sta` (`src/game/sim/tuning.ts`). Node copy lives in `src/game/SkillTree.ts`.

## UI

- Constellation hub shows spare points; each arm has small nodes + larger major/ult icons.
- EN + 粵 labels; icon-first; spend button on each arm head.
- In-run overlay: changes apply next run (same as before).

## Migration

`normalizeSave` maps legacy `skills.wis` → `sta` and `ultWis` → `ultSta` when the new fields are absent.
