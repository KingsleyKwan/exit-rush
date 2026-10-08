# Paid characters: GDD · 付費角色設計文件

**Game:** 逼落車 / Exit Rush (香城鐵路 · Hong City Rail parody)
**Cast:** 主角「上班族」 Office Worker (free, "Hero" in this doc) · 魔法師「凱婷」 Bad Girl · 高科技人「裝備L」 Gear L
**Status:** Approved for v0.8.0 P1 (Kingsley). Live economy (v0.8.1): 100 levels, 1 skill point per 10 first clears, one point learns one skill, free respec + 3 loadouts, bosses every 10 levels from L20 to L90, all 8 at L100.
**Scope:** design only. No code in this doc ships. **Every number is a proposal, marked tunable (🎛️), and must be checked with `npm run test:sim` before it lands.**

Legend: 🤖 = box agent can do it · 🛠️ = Kingsley's local Grok Build (Capacitor / Xcode / device) · 👤 = owner-only decision or account action.

---

## 0. TL;DR · 一頁睇晒

| | 主角「上班族」 Office Worker (FREE 免費) | 魔法師「凱婷」 Bad Girl (PAID 付費) | 高科技人「裝備L」 Gear L (PAID 付費) |
|---|---|---|---|
| Fantasy | Commuter who pushes through | Umbrella-wand witch who casts her way out | Gadget geek with a backpack full of toys |
| Progression | 力量 / 速度 / 體力 constellation (existing) | 風 / 冰 / 重力 on a wheel, plus the three mixes between them. Farther from the centre is stronger. Not the hero's tree | No tree. Coins 💰 → shop 🛒 → items in 平/中價/名貴 (Cheap/Mid/Luxury) tiers placed in a **backpack grid 背囊格** (2×2, one expansion to 2×3) |
| Resource | Stamina 體力 | Stamina 體力 + **Mana 魔力** (separate bar) | Stamina 體力 + item cooldowns + ≤ 3 consumables (in grid) |
| Points / coins | 1 point per 10 first clears (10) | 1 point per 10 of her own first clears (10) | Coins per clear, bounded replay coins, ⚡ fast-exit bonus |
| Respec | Free, 3 loadouts | Free, 3 loadouts | 100 % item sell-back, 3 grid layouts (套裝); grid expansions permanent |
| Power cap | 10 points: full branch (power 60) + ult + 3 skills | 10 points, chosen from 24. Last ranks lock only when they share an element | **Grid cells** (6 max) + body rule (1 shoes / gloves / head / core) |
| Counters all 8 specials + 8 bosses | ✅ | ✅ | ✅ |
| Price ✅ decided | Free | US$2.99 ≈ HK$23 | US$2.99 ≈ HK$23 (pack of both US$4.99 ≈ HK$38) |
| Web / Pages demo | Unlocked | **Unlocked** (no IAP, no ads) | **Unlocked** (no IAP, no ads) |

---

## 1. Pillars · 設計原則

1. **Different, not stronger · 唔同玩法，唔係課金變強.** A paid character changes *how* you solve a car, not *whether* you can. Every level, L100 included, must stay beatable with the free Hero. No paid character has an exclusive level, exclusive skip, extra timer or revive.
2. **Same power budget · 同一個力量上限.** Each character's endgame power is still the Hero's old budget, paid in fewer taps: **10 skill points** buy one full branch (power 60) + ultimate + 3 more skills (30 power). The Mage uses the same point economy. The Tech's power is capped by **backpack grid space (max 2×3, 6 cells)**, not by how many coins you hoard. One packed set is a stage kit. The other two sets are how you cover a different car.
3. **Clear-rate parity · 過關率相近 (measurable).** Balance-bot target: for every level band, each character's `earned` win rate is within **±10 pp** of the Hero's. At L100, each character's best build is within ±10 pp of the Hero's best ult build (Hero target band 30–55 %, see `docs/BALANCE.md`). 🎛️
4. **Every special has an answer in every kit · 每種乘客都有剋星.** All 8 special passengers and all 8 bosses have at least one counter per character (table in §4).
5. **No real-money currency · 金幣唔賣錢.** Tech coins are **earned in play only**. They are never sold for real money, never granted by IAP, and never granted by ads. No loot boxes, no randomised paid items.
6. **Paid once, yours forever · 一次買斷.** Characters are non-consumable IAPs. Restorable, offline-safe, and you keep your character progress if you reinstall and restore.
7. **Sim stays the truth.** All new mechanics live in `src/game/sim/` (pure TS, no three.js, no DOM), are deterministic for a seed, and are covered by `test:sim`.

---

## 2. Shared rules · 共通規則

| Rule | Value | Notes |
|---|---|---|
| Level unlocks | **Separate per character** (D12, v0.8.1) | A newly selected character starts at L1 |
| SP / coins source | Derived from **that character's** first clears | Mage/Tech SP/coins never borrow Hero clears |
| Per-character "cleared with" marks | Cosmetic badge per level (主角 / 魔 / 機 icons on the level card) | Optional completionist goal, no power reward |
| Skill/gear changes | Apply on next run (same as today) | Changed from the pause overlay or level-select |
| Ultimate cooldown | 10 s for all three (🎛️) | Same as the Hero today (`TUNING.ult.cooldown`) |
| HUD action buttons | Max **3 actives + 1 ult** (+ Tech: up to 3 consumables packed in the grid) | Keeps thumb layout readable on 390×844 |
| Bosses | Same 8 kings for everyone. Counter hits drain stubbornness **×2.5** (✦ weak-point icon) 🎛️ | Disables (freeze, daze, lure) last **50 %** as long on a boss 🎛️ |

---

## 3. 魔法師（女）Mage · 「凱婷」 Bad Girl

### 3.1 Concept & skin · 造型

- Chibi girl commuter in a **purple hooded cardigan over a school/office outfit**, star hairclip, small satchel. Her wand is a **folded umbrella (縮骨遮)**. The tip glows in the active element's colour. Very Hong Kong, and it reads clearly from the top-down camera.
- Silhouette cues for the top-down camera: wide witch-brim **hood** (a hat would clip the camera), umbrella held forward, and a floating **element orb** over her shoulder (red / cyan / yellow) that shows which element was cast last.
- Player ring + x-ray outline: same as the Hero, tinted violet.

### 3.2 Base stats vs Hero · 基本數值 🎛️

| Stat | Hero | Mage | Why |
|---|---|---|---|
| Mass (`baseMass`) | 1.3 | **1.1** | Lighter, so she gets pushed around more. Spells make up for it |
| Push force mul | 1.0 | **0.85** | Weaker shoulder. Her "shove" is 魔力掌 Arcane Palm (same shove code, violet FX) |
| Move speed mul | 1.0 | **1.05** | Nimble |
| Stamina max / regen | 100 / 12 | **90 / 12** | |
| **Mana 魔力** max / regen | n/a | **100 / 8 per s** (×0.5 inside a 大聲公 noise zone: "too noisy to concentrate") | Spells only |

**Mana sits alongside stamina (✅ decided 6 Oct 2026).** Stamina stays the "body" resource: pushing, shoving, being winded. That keeps the whole crowd-physics stamina model and its balance untouched. Mana is a second bar used **only** for spells.

Budget check: a 15 s level gives about 100 + 15 × 8 = 220 mana, roughly **6–8 casts** before cooldowns. That's plenty to feel magical, but not spammy. 🎛️

### 3.3 Spellbook economy · 魔法點

Same point budget as the Hero, different shape. **1 point per 10 first clears, 10 total. Each skill costs 1 point.** There is no power ladder (10/20/…/60) on this book. Free respec, 3 loadouts (魔法配置 1/2/3).

The book is a wheel. The centre is the start, not a skill. Ice (`i1`) sits at 10 o'clock, wind (`w1`) at 2 o'clock, gravity (`g1`) at 6 o'clock. Each next node on that ray is a stronger version of the same skill, not a different verb. Each skill costs 1 point. She can hold 10. There are 24 nodes, so a book is a choice.

The mix sits in the wedge between its two schools: `iw` between ice and wind, `wg` between wind and gravity, `ig` between ice and gravity. `iw1` needs `i1` and `w1`, `ig1` needs `i1` and `g1`, `wg1` needs `w1` and `g1`. The next mix rank needs only the mix rank before it. It does not need the matching pure rank.

Two rank-4 skills lock each other when they share an element. `i4` and `g4` can both be learned. `i4` blocks `ig4` and `iw4`. `ig4` blocks `i4` and `g4`, and also `iw4` and `wg4`, but not `w4`. Lower ranks do not lock. The HUD shows one button per learned line and casts the highest rank. There is no second button for the last rank. Mana and cooldown stay the same along a line, so the higher rank is strictly better.

Old fire / lightning saves do not map. They are refunded once. An old wind / ice / gravity id maps onto the same rank (`wind_1` → `w1`). A save that already has a real weather book is not refunded.

Mixes are learned skills. Knowing ice does not change a wind cast.

| Line | What it does | Stronger rank |
|---|---|---|
| 風 `w` | Blows people aside. Not a hit, not a daze, never a freeze | Farther and harder. From `w2` she also walks a little lighter |
| 冰 `i` | Cold only. They can still move | Colder and wider. `i1` stamina ×1.1. `i2` the smell bothers her less |
| 重力 `g` | Heavy only. Not a freeze | Heavier. `g1` shoves move her less. `g2` a squatter's feet do not drag her |
| 風+冰 `iw` | A blow that is also cold, so they take another way | Colder and stronger. No freeze |
| 冰+重力 `ig` | Cold, and they cannot move | Longer hold |
| 風+重力 `wg` | A blow, then they feel heavy and stay. They do not run off | Harder blow, heavier stop |

### 3.4 風 Wind · "Blow them aside 吹開"

Mana 18 / 3.4 s at every rank. 🎛️

| Id | 粵 / EN | Needs | Effect 🎛️ |
|---|---|---|---|
| `w1` | **微風** Breeze | — | Soft blow |
| `w2` | **順風** Tailwind | `w1` | Same blow, stronger. Speed ×1.1 |
| `w3` | **勁風** Strong Wind | `w2` | Wider again |
| `w4` | **狂風** Gale | `w3`, and no other last skill that uses wind | Strongest blow |

### 3.5 冰 Ice · "Feel the cold 覺得凍"

Mana 18 / 3.8 s at every rank. Cold only. Not a hold. 🎛️

| Id | 粵 / EN | Needs | Effect 🎛️ |
|---|---|---|---|
| `i1` | **涼氣** Cool Air | — | Cool. Stamina ×1.1 |
| `i2` | **冷氣** Cold Air | `i1` | Colder. Smell bothers her less |
| `i3` | **寒氣** Hard Cold | `i2` | Harder cold |
| `i4` | **極凍** Bitter Cold | `i3`, and no other last skill that uses ice | Coldest. Still not a freeze |

### 3.6 重力 Gravity · "Feel the weight 覺得重"

Mana 18 / 3.8 s at every rank. Heavy only. Not a hold. 🎛️

| Id | 粵 / EN | Needs | Effect 🎛️ |
|---|---|---|---|
| `g1` | **腳重** Heavy Feet | — | Heavy feet. Shoves move her less |
| `g2` | **身重** Heavy Body | `g1` | Heavier. A squatter's sideways drag does not catch her |
| `g3` | **撳住** Held Down | `g2` | Heavier still |
| `g4` | **壓實** Weighed Down | `g3`, and no other last skill that uses gravity | Heaviest. Still not a freeze |

`iw` is mana 20 / 4.0 s: **涼風** Cool Breeze → **冷風** Cold Wind → **寒風** Hard Wind → **極寒風** Bitter Wind. `ig` is mana 22 / 4.6 s: **凍住** Cold Hold → **再凍住** Colder Hold → **凍到企定** Still Cold → **凍到郁唔到** Cannot Move. `wg` is mana 20 / 4.0 s: **重風** Heavy Wind → **壓風** Pressing Wind → **吹完停** Blow and Stop → **吹到企定** Blown Still.

A planted squat is still the hardest body to move. Wind does not rewrite his spot. Only the ice+gravity line holds him. Bosses are worn down by standing in the weather; they are not thrown, dazed, or blinked through.

### 3.7 What to learn first · 點配

Each pure start is already a cast. A mix does nothing until that mix row is learned. `i4` and `g4` can sit in the same book. `ig4` cannot sit next to either of them.

---

## 4. Counter matrix · 剋制表 (all 8 specials + 8 bosses × 3 characters)

Hero entries match `SkillTree.ts` / `bosses.ts`. Level = earliest that counter exists if every point so far went into that branch (one skill per 10 first clears; the level is unchanged from the old 1-power-per-clear timing), or the shop unlock level (Tech).

### 4.1 Special passengers · 特別乘客

| Passenger (intro) | 主角 Hero | 魔法師 Mage | 高科技人 Tech |
|---|---|---|---|
| 拉行李喼 Luggage (L6) | 跨行李 Hurdle (SPD 40) · 震地 Ground Pound (STR 50) | 微風 Breeze blows the case aside. 狂風 Gale is the same blow, stronger | 磁浮滑板鞋 Hover Skates · 震波拳套 Shock Gauntlets |
| 踎低客 Squat (L8) | 飛身 Leap (SPD 50) | 身重 keeps his feet off her. 凍住, once learned, holds him | 彈簧鞋 Spring Boots · 液壓手套 名貴 |
| 惡臭人 Stench (L9) | 忍臭 Hold Breath (STA 40) | 冷氣 Cold Air. Cold pauses the smell | 防毒面罩 Gas Mask · 手提風扇 Turbo Fan · 薄荷香口膠 Mint Gum |
| 一家大細 Family (L12) | 好脾氣 Unbothered (STA 60) · 飛身 Leap (kids) | 凍住 Cold Hold, once ice and gravity are both started | 卡通平板 Cartoon Tablet · 彈簧鞋 Spring Boots (kids) |
| 百厭仔 Brat (L15) | 回魂 Second Wind (STA 50) | 撳住 Held Down. 凍住 if that mix is learned | 誘餌無人機 Decoy Drone · 外骨骼 名貴 |
| 情侶 Couple (L18) | 拆散情侶 Split (STR 40) · 穿插 Thread (SPD 60) | 涼風 Cool Breeze sends them another way. Needs both starts | 整蠱震震手套 Joy Buzzer Gloves |
| 暴躁男 Angry (L21) | 頂硬上 Stand Firm (STR 60) | 極凍 Bitter Cold. 凍住 only if that mix was learned instead | 外骨骼 Exo-Brace |
| 大聲公 Loudmouth (L26) | 好脾氣 Unbothered (STA 60) | Cold. 極凍 is the same cold, stronger | 降噪耳機 Noise-Cancel Headphones · 薄荷香口膠 Mint Gum |

### 4.2 Bosses · 大佬 (L20–L90, all at L100)

| Lv | Boss | 主角 Hero | 魔法師 Mage (✦ weak-point spell) | 高科技人 Tech (✦ weak-point item) |
|---|---|---|---|---|
| 20 | 行李箱大王 Suitcase King | 跨行李 · 震地 | ✦ 微風 Breeze | ✦ 震波拳套 · 磁浮滑板鞋 名貴 (boss case) |
| 30 | 臭狐王 Stink Fox King | 忍臭 | ✦ 冷氣 Cold Air | ✦ 防毒面罩 名貴 · 手提風扇 |
| 40 | 踎低王 Squat King | 飛身 · 蓄力一推 | ✦ 凍住 Cold Hold | ✦ 彈簧鞋 · 液壓手套 名貴 |
| 50 | 大家長 The Patriarch | 好脾氣 · 飛身 | ✦ 凍住 Cold Hold | ✦ 卡通平板 · 彈簧鞋 |
| 60 | 衰仔王 Brat King | 回魂 | ✦ 撳住 Held Down | ✦ 誘餌無人機 · 外骨骼 名貴 |
| 70 | 黏身情侶王 Clingy Couple Royals | 穿插 · 拆散情侶 | ✦ 涼風 Cool Breeze | ✦ 整蠱震震手套 |
| 80 | 嬲嬲豬王 Grumpy Hog King | 頂硬上 | ✦ 極凍 Bitter Cold | ✦ 外骨骼 |
| 90 | 大聲公王 Loudmouth King | 好脾氣 | ✦ 極凍 Bitter Cold | ✦ 降噪耳機 · 薄荷香口膠 |
| 100 | All eight · 八王齊聚 | Pick 1 branch + ult + extras | A few lines, not every last rank | Pack a 16-cell grid (body rule: 1 shoes / gloves / head / core) |

**Timing parity:** Hero and Mage counters need 40+ pts in a branch (≈ L41+). Tech counter items go on sale at the passenger's intro level, but the **平 tier is weak (≈ 40 % of the Hero node's effect) and the early grid is tiny (2×2)**. 中價 unlocks at L40 and 名貴 at L60, and each takes more space. Early-band win rates must stay inside the ±10 pp parity band (§1, §5.4.5).

`bosses.ts` → `counterZh/En` becomes per character: `counters: Record<CharacterId, {zh,en}>`.

---

## 5. 高科技人 Tech · 「裝備L」 Gear L (EN name tunable 🎛️)

### 5.1 Concept & skin · 造型

- Chibi gadget geek from an electronics market: oversized **hoodie**, **LED visor** on the forehead, a **big backpack with an antenna** and a coiled power-bank cable, cargo shorts and chunky sneakers. Equipped items change the model (helmet/visor, glove colour, shoe type, backpack add-ons). That's the reward loop.
- Equipment shows on the low-poly mesh as swappable sub-parts merged into one geometry per kit hash (cached), so the player is still 1 draw call.

### 5.2 Base stats vs Hero 🎛️

| Stat | Hero | Tech | Why |
|---|---|---|---|
| Mass | 1.3 | **1.4** | Heavy backpack |
| Push force mul | 1.0 | **1.0** | |
| Move speed mul | 1.0 | **0.95** | Gear is heavy, and the shoes fix it |
| Stamina max / regen | 100 / 12 | **90 / 11** | Power Bank fixes it |
| Progression | tree | **shop** | No skill points shown. SP still counted in the save for analytics/parity only |

### 5.3 Coin economy · 金幣 💰 (earned only, 只可以玩返嚟)

| Source | Amount 🎛️ | Bound |
|---|---|---|
| First clear 首次過關 | `10 + levelId` coins (L1 = 11 … L99 = 109) | Once per level |
| Boss level (L20…L90) | ×2 of the first-clear amount | Once |
| L100 | 300 | Once |
| ⚡ Fast exit 快閃 | +50 % of the first-clear amount, if you exit with ≥ 35 % of the timer left | **Once per level, ever** |
| Replay 重玩 | 20 % of the first-clear amount | **First 5 replays per level only** (lifetime), then 0 |
| Retro grant 補發 | On first Tech run: Σ first-clear coins for levels already cleared (no ⚡) | Once |
| IAP / ads | **Never.** No coin packs, no coin doubling ads | — |

Totals (approx.): first clears ≈ **6,760**; ⚡ max ≈ **3,380**; replay max ≈ **6,760** → **lifetime cap ≈ 16,900 coins**. Grinding is bounded by design. Even unlimited time can't buy power past the 6-cell bag. Extra coins buy different kits for the three sets, not a bigger bag. The cumulative earn curve per level is in §5.4.3.

Coins are **derived, not stored**: `balance = earned(cleared, ledger) − Σ itemSpend − gridSpend − consumableSpend`. If a price is retuned, the save reconciles. If it's over-spent, items are refunded with a one-time 「金幣已重新計算」 notice, like the v0.7 SP respec notice.

### 5.4 Capacity grid · 背囊格 (inventory-Tetris capacity limit)

Kingsley's addition: the Tech's power is limited by **backpack space**, Resident-Evil style. **Only items placed in the grid are active for the level.** Coins now go to two things: **buying/upgrading items** and **expanding the grid**. That's the core strategic trade-off.

#### 5.4.1 Grid rules · 規則

| Rule | Value 🎛️ |
|---|---|
| Starting grid | **2×2 (4 cells)** |
| Placement | Items snap to cells. Rotate in 90° steps (up to 4 orientations per shape, no mirroring). No overlaps, nothing outside the grid |
| Active = in grid | Owned items in the tray do nothing. Grid contents are read once at run start (no mid-run edits) |
| Body rule | At most **one** each of 👟 Shoes, 🧤 Gloves, 🪖 Head, ⚙️ Core in the grid (one pair of shoes, one pair of gloves). 🔧 Gadgets: any number, but each item only once |
| Tier rule | One tier per item in the grid. **Owning a tier lets you equip any lower tier for free** (downsize 平/中價/名貴 to fit) |
| Active items | Max **3 active** gadget/shoe items + 1 core in the grid (HUD limit); a 4th active placement is shown red |
| Consumables 🎒 | 1×1 each, max 3 cells. Each cell packs 1 unit from stock and uses it up when used. Empty stock = greyed, inactive cell |
| Expansion | Permanent, **non-refundable** (it's capacity, not power). Items stay 100 % sell-back |
| Grid growth | New columns/rows are added on the right/bottom; existing placements keep their coordinates |

#### 5.4.2 Item tiers & shapes · 平/中價/名貴 (Cheap / Mid / Luxury)

**Decided (6 Oct 2026):** the stronger the item, the **less square and more irregular** its shape. **平 Cheap = 1×1, 中價 Mid = 1×2 domino, 名貴 Luxury = an awkward polyomino** (line, L, T, S/Z, U, plus). Big pieces cost cells *and* packing efficiency: they leave odd gaps that only small pieces can fill. Rotation (90° steps) stays. No mirroring, so S and Z are different pieces. 🎛️

Shape legend (`#` = cell):

| Code | Name | Cells | Mask (unrotated) | Fits in |
|---|---|---|---|---|
| `O1` | 1×1 | 1 | `#` | any |
| `I2` | domino 1×2 | 2 | `##` | any |
| `I3` | line 3 | 3 | `###` | 2×3+ (vertical) |
| `L3` | L-tromino | 3 | `#.` / `##` | any ≥ 2×2 |
| `I4` | line 4 | 4 | `####` | not sold — a line of 4 does not fit 2×3 |
| `L4` | L-tetromino | 4 | `#.` / `#.` / `##` | 2×3+ |
| `T4` | T-tetromino | 4 | `###` / `.#.` | 3×3+ (or 2×3 rotated) |
| `S4` / `Z4` | S / Z tetromino | 4 | `.##` / `##.` · `##.` / `.##` | 2×3+ |
| `U5` | U-pentomino | 5 | `#.#` / `###` | 2×3+ |
| `X5` | plus | 5 | `.#.` / `###` / `.#.` | not sold — the plus needs 3×3 |

Tier footprints by family:

| Item family | 平 Cheap | 中價 Mid | 名貴 Luxury |
|---|---|---|---|
| General stat items (S1, G1, H3, D1) | `O1` | `I2` | 3-cell irregular (`I3` / `L3`) |
| Counter items (S2, S3, G2, G3, H1, H2, D3, D4, D5) | `O1` | `I2` | 4-cell irregular (`L4` / `T4` / `S4` / `Z4`) |
| Exo-Brace D2 (bulky) | `O1` | `I2` | `U5` |
| Cores (C1, C2, C3) | `I2` | `L4` | `U5` |
| Consumables (K1–K3) | `O1` only | — | — |

Effect scaling (rule of thumb): **平 ≈ 40 %, 中價 ≈ 70 %, 名貴 = 100 %** of the matching Hero node. Per cell that's 40 % / 35 % / 25 % (20 % for 5-cell pieces), *before* the packing penalty of irregular shapes. 名貴 is for specialists and bosses, 平/中價 for broad coverage. 🎛️

**Implementation note:**
- Each shape is a **cell mask** defined as string rows (`['###', '.#.']`). At load it's converted to a list of `(dx, dy)` offsets, and its **4 rotations** (90° steps: `(x, y) → (h−1−y, x)`) are precomputed, normalised to the top-left and de-duplicated (`O1`/`X5` have 1, `I*`/`S4`/`Z4` have 2, the rest 4).
- The bag stops at 2×3. Occupancy still uses a stride-4 bitmask (`bit = y·4 + x`) and rejects `x ≥ 4` or `y ≥ 4`, so do not widen the bag without rewriting that mask. A placed rotation is `maskBits << (y·4 + x)`.
- **Collision check:** the piece is in bounds iff `x + w ≤ cols && y + h ≤ rows` (using the rotated bounding box), and free iff `(occupied & pieceBits) === 0`. Placement is `occupied |= pieceBits`.
- The same functions drive drag preview (green/red), auto-pack (deterministic backtracking: largest/most irregular first, then fixed rotation order) and save validation. They're pure TS in `src/game/techKit.ts`.

#### 5.4.3 Expansion tiers · 背囊擴充

**Decided (7 Oct 2026):** the bag stops at **6 cells**. A 4×4 held a cheap counter for every passenger, so one set cleared every stage. There is no third size.

| Tier | Grid | Cells | Price 🎛️ | Cumulative | When |
|---|---|---|---|---|---|
| 0 | 2×2 | 4 | free | 0 | start |
| 1 | 2×3 | 6 | 150 | 150 | ≈ L11 (≈190 coins earned) |

Old saves that bought 3×3 / 3×4 / 4×4 (the removed 450 / 1,200 / 2,400 steps) shrink to 2×3 on load. Those coins come back, because the balance is earned minus what the current price table charges. Pieces that no longer fit leave the grid and stay owned. `gridTier` in the save may still read 2–4 until that load.

A cheap universal kit is about 9 cells: one shoe, one glove, one head, all five gadgets, and one drink. Six cells cannot hold it. A 中價 piece is 2 cells. A 名貴 piece (`L4`, `T4`, `S4`, `Z4`, `U5`, `I3`, `L3`) takes 3–5, so it is most of the bag. Every sold tier fits an empty 2×3. `I4` and `X5` are not sold.

#### 5.4.4 Sample layouts · 擺位例子

Grid sizes are **cols × rows**.

**2×2 start (L6, luggage intro):** 4 cells, all 平.
```
┌──────┬──────┐
│ S3·平 │ G2·平 │   磁浮滑板鞋 · 震波拳套
├──────┼──────┤
│ K1   │ K1   │   能量飲品 ×2
└──────┴──────┘
```

**2×3 luggage / stench set.** Full. No room for spring boots, headphones, the tablet, or the drone.
```
┌──────┬──────┐
│ S3·平 │ G2·平 │   行李箱
├──────┼──────┤
│ H1·平 │ D5·平 │   臭味
├──────┼──────┤
│ K1   │ K3   │   飲品 · 香口膠
└──────┴──────┘
```

**Set 2, a different car (squat, noise, family, brats).** Same 6 cells. This is why the three sets exist.
```
┌──────┬──────┐
│ S2·平 │ H2·平 │   彈簧鞋 · 降噪耳機
├──────┼──────┤
│ D4·平 │ D3·平 │   平板 · 無人機
├──────┼──────┤
│ D1·平 │ K1   │   充電寶 · 飲品
└──────┴──────┘
```

**One upgrade eats the bag.** Gas Mask 名貴 is a `T4` (4 cells, rotated into 2×3). Two cells remain.
```
┌──────┬──────┐
│ H1·名貴│ H1·名貴│
├──────┼──────┤
│ H1·名貴│ K3   │
├──────┼──────┤
│ H1·名貴│ K1   │
└──────┴──────┘
```

#### 5.4.5 Balance implications · 平衡

- **The grid is the Tech's power budget.** Six cells is one stage, not every stage. The three sets are the way to keep a second answer. Do not grow the bag to put those answers back in one grid.
- **Early game:** a 2×2 grid with 平 tiers ≈ 40 % counters. Tech counters exist from the intro level (earlier than the Hero's 40-pt nodes) but are weak and space-starved. Bot parity checks L6–30 for the ±10 pp band (§1). If early Tech runs too strong, raise the 2×3 price or cut 平 to 30 %. Do not retune just because a later band was already off.
- **Bosses:** weak-point drain ×2.5 applies at **any tier**. Disable durations scale with tier (and are halved on bosses), so a boss set wants the counter that fits, not every counter. The level card shows ✦ recommended counter + tier.
- **L100:** one head, one pair of shoes, one pair of gloves, and 6 cells. A core 中價 is an `L4` and leaves 2 cells. A core 名貴 is a `U5` and leaves 1 cell.
- **Sell-back stays 100 %.** The one expansion is not refunded by the sell button. Shrinking a pre-cap save is the exception: the removed expansion prices are no longer in `gridSpend`, so those coins return.
- **Irregular = strong:** a 名貴 piece costs most of the 6 cells, and every sold tier fits an empty bag. Owning a tier still lets you wear 中價 or 平 for free. The bot measures the real packed power (auto-pack), not raw cells.
- **Consumables in the grid (✅ decided):** every emergency drink competes with a permanent item for a cell. There is no separate pocket.
- **Grind:** replay coins are bounded (§5.3). They buy more items to swap between sets. They do not buy a seventh cell.

#### 5.4.6 UI: drag-to-place on phone · 擺位介面

- **Workshop › Equip tab:** the live grid on top (2 columns, 2 then 3 rows), with the **tray** below. One 「擴充背囊」 button buys 2×3 for 150, then disappears. A standing note says the bag stops at 6 cells.
- **Drag** an item from the tray. The ghost footprint is green when it fits and red with a reason chip when it doesn't (「冇位」 / 「已有鞋」 / 「主動道具上限」). Snap on release with a haptic tick.
- **Rotate:** ⟳ button while dragging/selected, or two-finger twist / double-tap.
- **Tier switch:** tap a placed item → 平/中價/名貴 pills (owned tiers only). The footprint previews before you confirm.
- **Tap-to-place alternative** (accessibility, no drag needed): tap an item, then tap a target cell. If that turn sticks out of the bag, the next turn that fits is used.
- **Remove:** drag back to the tray, or tap → 「除低」.
- **自動排 Auto-pack:** packs what fits in the current bag (largest footprints first, then a fixed rotation order). Also used by 「推介套裝」. Pieces that do not fit stay in the tray.
- **Sets 套裝 1/2/3:** each set saves its own placements. Swapping sets is how one character covers more than one kind of car.
- Capacity readout: 「4/6 格」, plus the coin balance top-right.

#### 5.4.7 Loadouts per grid · 套裝

Each of the 3 gear sets stores its own placement list. Expanding the grid never breaks a set (coordinates stay). If a set becomes invalid (an item was sold, a tier downgraded by reconcile, or tuning changed a footprint), it's normalised on load: the offending items return to the tray and a one-time toast appears (「套裝 2 有裝備放返入背包」).

### 5.5 Shop catalogue · 商店 (20 items, tiers 平/中價/名貴 Cheap/Mid/Luxury) 🎛️

Prices are per tier: **平 / +中價 / +名貴 (total)**. Footprint per §5.4.2. "Req" = level you must have cleared to buy that tier.

| # | Slot | Item 粵 / EN | Type | 平 → 中價 → 名貴 effect | Footprint 平/中價/名貴 | Price | Req | Counters |
|---|---|---|---|---|---|---|---|---|
| S1 | 👟 | **跑鞋** Sprint Sneakers | Passive | Speed ×1.10 / 1.20 / 1.30; 名貴 + faster when unobstructed | `O1` / `I2` / `I3` | 100 / 200 / 350 (650) | — | — |
| S2 | 👟 | **彈簧鞋** Spring Boots | Active | Hop over squatters + kids; CD 9 / 7.5 / 6 s | `O1` / `I2` / `Z4` | 150 / 250 / 450 (850) | 8 / 40 / 60 | Squat, Family kids |
| S3 | 👟 | **磁浮滑板鞋** Hover Skates | Passive | Pass suitcases; pace ×0.6 / 0.7 / 0.8; 名貴 also the boss case | `O1` / `I2` / `S4` | 150 / 250 / 450 (850) | 6 / 40 / 60 | Luggage |
| G1 | 🧤 | **液壓手套** Hydraulic Gloves | Passive | Push ×1.12 / 1.25 / 1.40; 名貴 squat shove ×2 | `O1` / `I2` / `L3` | 100 / 200 / 350 (650) | — | (Squat at LG) |
| G2 | 🧤 | **震波拳套** Shock Gauntlets | Passive (shove) | Full-charge shove shockwave r 1.2 / 1.4 / 1.6, luggage ×2.0 / 2.3 / 2.6 | `O1` / `I2` / `T4` | 150 / 250 / 450 (850) | 6 / 40 / 60 | Luggage |
| G3 | 🧤 | **整蠱震震手套** Joy Buzzer Gloves | Passive (shove) | Shove hit on a couple → they let go for 2.5 / 3.5 / 4.5 s | `O1` / `I2` / `L4` | 150 / 250 / 450 (850) | 18 / 40 / 60 | Couple |
| H1 | 🪖 | **防毒面罩** Gas Mask | Passive | Stench slow −50 / −75 / −100 % | `O1` / `I2` / `T4` | 150 / 250 / 450 (850) | 9 / 40 / 60 | Stench |
| H2 | 🪖 | **降噪耳機** Noise-Cancel Headphones | Passive | Loudmouth drain −35 / −55 / −70 % | `O1` / `I2` / `L4` | 150 / 250 / 450 (850) | 26 / 40 / 60 | Loudmouth |
| H3 | 🪖 | **AR眼鏡** AR Visor | Passive | Aim assist (gapSense +0.12 / 0.24 / 0.35); M gap-arrow hint; 名貴 angry wind-up warning ring 0.2 s early | `O1` / `I2` / `I3` | 100 / 200 / 350 (650) | — | — |
| D1 | 🔧 | **充電寶** Power Bank | Passive | Stamina max +15 / 30 / 45, regen +3 / 5 / 7 | `O1` / `I2` / `L3` | 100 / 200 / 350 (650) | — | — |
| D2 | 🔧 | **外骨骼** Exo-Brace | Passive | Mass +0.3 / 0.5 / 0.7; angry impulse ×0.6 / 0.35 / 0.15; 名貴 brat bumps ×0.5 | `O1` / `I2` / `U5` | 150 / 250 / 450 (850) | 21 / 40 / 60 | Angry, (Brat at LG) |
| D3 | 🔧 | **誘餌無人機** Decoy Drone | Active | Brats within 3 m chase the drone for 2.5 / 3.5 / 4.5 s; CD 10 s | `O1` / `I2` / `Z4` | 150 / 250 / 450 (850) | 15 / 40 / 60 | Brat |
| D4 | 🔧 | **卡通平板** Cartoon Tablet | Active | Family within 2.5 m stops and huddles (no drag / no stamina cost) for 3 / 4 / 5 s; 名貴 also brats 2 s; CD 12 s | `O1` / `I2` / `L4` | 150 / 250 / 450 (850) | 12 / 40 / 60 | Family |
| D5 | 🔧 | **手提風扇** Turbo Fan | Active | Gust cone 2.0 / 2.3 / 2.6 m (impulse 3.0 / 3.6 / 4.2); blows stench clouds away 3 / 4 / 5 s; CD 6 s | `O1` / `I2` / `S4` | 150 / 250 / 450 (850) | 9 / 40 / 60 | Stench, general lane |
| C1 | ⚙️ | **機械臂** Mech Arms | Ult | = 鐵牛撞門 (shockwave + charge); CD 14 / 12 / 10 s | `I2` / `L4` / `U5` | 900 / 600 / 900 (2,400) | 70 / 80 / 90 | — |
| C2 | ⚙️ | **噴射背包** Jet Pack | Ult | = 閃身落車 (burst dash); CD 14 / 12 / 10 s | `I2` / `L4` / `U5` | 900 / 600 / 900 (2,400) | 70 / 80 / 90 | — |
| C3 | ⚙️ | **力場護盾** Force Field | Ult | = 鐵馬企穩 (burst regen + heavy stance); CD 14 / 12 / 10 s | `I2` / `L4` / `U5` | 900 / 600 / 900 (2,400) | 70 / 80 / 90 | — |
| K1 | 🎒 | **能量飲品** Energy Drink | Consumable | +40 stamina, clears winded | `O1` | 25 | — | — |
| K2 | 🎒 | **雙倍特濃** Double Espresso | Consumable | 5 s speed ×1.2 | `O1` | 35 | — | — |
| K3 | 🎒 | **薄荷香口膠** Mint Gum | Consumable | 6 s stench immunity + loudmouth drain −50 % | `O1` | 30 | 9 | Stench, Loudmouth |

Shape codes per §5.4.2. Buying a tier needs the previous one (平 → 中價 → 名貴), and the price shown is the upgrade cost. Sell-back refunds 100 % of everything spent on that item.

**Consumable rules · 消耗品規則:** coins only, never IAP. They occupy grid cells (1×1, **max 3 per run**). Stock cap 9 each. Using one consumes it, and so does a lost run (it was used). Unused packed units stay in stock. Not usable in trial runs. Not sold back.

**Power check:** six cheap cells cannot hold one of each worn slot plus every gadget. A 名貴 piece that fits takes most of those six. Coins at L100 buy alternate sets, not a bigger bag. 100 % item sell-back means extra (bounded) replay coins buy a different kit, not a seventh cell.

### 5.6 Recommended kit · 推介套裝

Same idea as the Mage's 「推介」: the workshop proposes purchases, expansions and an **auto-packed layout** for the next unbeaten boss (e.g. before L20: Hover Skates 平 + Shock Gauntlets 平, expand to 2×3 if affordable). The balance bot's shop policy uses the same table.

---

## 6. UI / UX · 介面

General rules: icon-first, EN + 粵 (zh-HK default, colloquial). Every string goes in both `en.ts` and `zh-HK.ts`. 44 px touch targets, safe-area vars. Screenshots at 390×844 in both languages, reviewed before calling anything done (AGENTS.md rule 8).

### 6.1 Character select · 揀角色

- Entry: a **character chip** (portrait + name) top-left on the level select, and a 「角色」 button on the title screen. First launch skips the screen (Hero is auto-selected and the FTUE runs unchanged).
- Layout: 3 swipeable cards (Hero centred). Each card: portrait, name EN + 粵, 3 playstyle icons (strength / wind-ice-gravity / shop), a one-line pitch (「推出去！」/「風、冰、同重力。」/「買裝備，砌套裝！」), a difficulty dot, and a state button:
  - Owned → **揀佢 Select**
  - Not owned → **購買 Buy (HK$23)**, with the price string from StoreKit (`localizedPriceString`), **never hard-coded**, plus **試玩 Try**
- Footer (iOS build only): **恢復購買 Restore Purchases** (small, always visible), and the pack offer if neither character is owned.
- Web/Pages demo build (`VITE_PLATFORM=web`): every card shows **揀佢 Select**, with no prices, Buy, Restore or Try buttons and no ads (§8.4).

### 6.2 Progression screen swaps · 成長畫面

| Character | Bottom-nav label | Screen |
|---|---|---|
| Hero | 🌟 技能 Skills | Existing constellation (`constellationSkills.ts`) |
| Mage | 📖 魔法 Spells | Her own book, not the hero constellation. A wheel: the start is the centre, ice at 10 o'clock, wind at 2, gravity at 6. Mixes sit between the two schools. Farther out is the stronger version. A mix needs both starts. More than one last skill is allowed unless they share an element. Tap a ready node to spend 1 point. The HUD shows one button per learned line and casts the highest rank. |
| Tech | 🛒 裝備 Gear | **Workshop 工作室**: tabs **裝備 Equip (backpack grid + tray, §5.4.6) / 商店 Shop / 套裝 Sets 1-2-3**; coin balance + 「4/6 格」 top-right; each item card shows icon, 平/中價/名貴 pills with footprints, effect, counters chip, price, 買/升級/賣. Expand stops after 2×3 |

The hero constellation is unchanged. 凱婷 does not share those node positions or the fire / lightning schools.

### 6.3 HUD differences · 遊戲介面

```
Hero:  [stamina bar]                         [act1][act2]  [ULT]  [SHOVE]
Mage:  [stamina bar]                         [spell1][spell2][spell3] [ULT] [PALM]
       [mana bar ▓▓▓▓░ violet]               (element-coloured, CD ring + mana pip)
Tech:  [stamina bar]   💰 run preview +36    [act1][act2][act3] [CORE] [SHOVE]
                                             [🎒][🎒][🎒]  (small, above; only items packed in the grid)
```

- Mana bar sits under stamina, thinner, violet. It flashes and buzzes when a cast fails for lack of mana (「魔力唔夠！」 chip).
- Spell buttons grey out on cooldown with a radial ring. A **counter glow** (✦) appears when a matching special/boss is within range, so newcomers learn the counters.
- Tech coin preview shows potential coins for this run (first-clear / ⚡ / replay remaining), so the bounded-grind rule is visible: 「重玩金幣 3/5」.

### 6.4 Onboarding · 新手教學

| Character | First open | First run |
|---|---|---|
| Mage | The book shows wind, ice, and gravity, then the mixes. Wind blows people aside. A mix happens only after that mix is learned. | Title-screen hint is 吹開, not a strike. She does not daze, explode, or blink. |
| Tech | Retro coin grant toast (「補發 1,234 金幣！」) → guided first purchase (「推介套裝」) → **drag it into the 2×2 grid** (ghost hand shows drag + ⟳ rotate) → explain 平/中價/名貴 sizes and 🔒 expansion cells | Ghost hand on the first gadget button and the first consumable. Result screen explains ⚡ fast-exit and replay caps once |
| Both | Trial (試玩) runs show a persistent 「試玩中 · 不計獎勵」 banner | — |

### 6.5 Try before buy · 試玩

- **試玩車廂 Trial Car:** each paid character can play **L6 (luggage intro)** and **L20 (Suitcase King)** with a **preset build** (Mage: 微風 and 順風, 涼氣 and 冷氣, 腳重 and 身重, plus the first mix of each pair — 涼風, 凍住, 重風 — and no last rank; Tech: the same 2×3 bag, all 平 — Hover Skates, Shock Gauntlets, Gas Mask, Drone, Tablet, 1 Energy Drink), unlimited times, offline. Preset because a fresh 0-point Mage has no skills and would demo badly. The trial kit is not written into the save. The trial level list is unchanged. 🎛️
- Trial runs give **no SP, coins, clears or badges**, and don't touch the save beyond a `trialsPlayed` counter. The end card shows **Buy / Back**, no nag loop (at most 1 auto-shown offer per session). L20 needs to be unlocked first; otherwise only L6 is offered.
- Trial exists in the **iOS build only**. On the web demo everything is already unlocked.
- This is an in-game trial, not Apple's tier-0 "XX-day Trial" IAP (see §8.3). No time limit, so there's nothing to disclose about expiry.

---

## 7. Technical design · 技術設計

### 7.1 Character abstraction

New `src/game/charactersDef.ts` (pure data, no three.js; name avoids clashing with render-side `characters.ts`):

```ts
export type CharacterId = 'hero' | 'mage' | 'tech';
export type ProgressionKind = 'tree' | 'shop';   // Mage = 'tree' with a different TreeDef

export interface BaseStats {
  mass: number; pushMul: number; speedMul: number;
  staminaMax: number; staminaRegen: number;
  manaMax?: number; manaRegen?: number;           // Mage only
}

export interface CharacterDef {
  id: CharacterId;
  nameEn: string; nameZh: string;
  skin: SkinId;                                   // render-side look key (characters.ts Spec)
  base: BaseStats;
  progression:
    | { kind: 'tree'; tree: TreeDef }             // hero: HERO_TREE (existing SKILL_NODES), mage: SPELL_TREE
    | { kind: 'shop'; catalog: ShopCatalog };     // tech: TECH_SHOP
  entitlement?: 'mage' | 'tech';                  // undefined = free
  trial: { levels: number[]; preset: TrialPreset };
  hud: { resource2?: 'mana'; maxActives: 3; consumables?: 3 };
}
export const CHARACTERS: Record<CharacterId, CharacterDef>;
```

- `TreeDef` generalises `SkillTree.ts`: `{ branches: [{id, colour, fill: FillCoeffs}], nodes: SkillNodeDef[], ults: UltDef[] }`. The Hero's existing data becomes `HERO_TREE` **without changing ids** (`str_t1` …), so saves and tests stay valid.
- `modsFor(char: CharacterDef, save: SaveData): PlayerMods` is a pure function, replacing direct `modifiersFromSkills()` calls. `PlayerMods = SkillModifiers & { mass0, manaMax, manaRegen, spellPower, cdr, abilities: AbilitySlot[], passives: PassiveFlags }`. For the Hero it must return values **bit-identical** to today's `modifiersFromSkills()` (golden test).

### 7.2 Save format · 存檔 (v0.8.1: **separate** level progress per character)

Keep `version: 1` and the key `exit-rush-v1`. **Add** fields with defaults in `defaultSave()` + `normalizeSave()` (AGENTS.md save rules):

```ts
character: CharacterId;                       // default 'hero'; falls back to 'hero' if the entitlement is missing
entitlementCache: { mage: boolean; tech: boolean; noAds: boolean; at: number }; // cache only, StoreKit is the truth
mage: { loadouts: TreeState[]; active: number; spellBars: string[][] };          // 3 slots, like hero loadouts
tech: {
  items: Record<ItemId, 0 | 1 | 2 | 3>;       // highest owned tier: 0 none, 1 平, 2 中價, 3 名貴
  gridTier: 0 | 1 | 2 | 3 | 4;                // live bag is 0 = 2×2, 1 = 2×3. 2–4 are old saves; reconcile clamps them
  sets: GearSet[];  activeSet: number;        // 3 sets
  // GearSet = { placements: { id: ItemId | ConsumableId; tier: 1|2|3; x: number; y: number; rot: 0|1|2|3 }[] }
  stock: Record<ConsumableId, number>;
  ledger: Record<string /*levelId*/, { replays: number; fast: boolean }>;
  consumableSpend: number; retroGranted: boolean; coinNotice: boolean;
};
clearedWith: Record<string /*levelId*/, CharacterId[]>;   // cosmetic marks
trialsPlayed: Record<CharacterId, number>;
```

The Hero's `skills` / `loadouts` / `activeLoadout` stay **untouched** (no rename, no migration risk).

**Why separate level progress (D12, decided v0.8.1):**
1. Each character is its own journey — switching to Mage starts at L1 with Mage-only SP.
2. Existing saves: all pre-0.8.1 clears belong to Hero; Mage spell spend is kept only if backed by Mage clears (else refund + one-time notice).
3. Separate allocations mean switching characters never wipes a build. Free respec already exists per character.
4. "Cleared with" marks stay cosmetic for completionists.

Native: the save moves to Capacitor Preferences per APP_STORE.md §B11. Purchases are **not** stored only in the save: StoreKit/RevenueCat is re-queried on launch and on Restore. The cache allows offline play, and a refund/revoke re-locks the character but keeps its progress data.

### 7.3 Sim integration (three.js-free)

- `Sim` constructor takes `PlayerMods` (a superset; the Hero path is unchanged).
- New `src/game/sim/abilities.ts`: a registry of `AbilityDef { id, resource: 'stamina'|'mana'|'none', cost, cd, bossDisableMul, cast(ctx) }`. `ctx = { world, crowd, player, time, rng, emit, level }`. `Sim.tryAbility(slot)` generalises `tryLeap` / `trySecondWind` / `tryUltimate`, which stay as thin wrappers so the existing HUD and bot keep working.
- `PlayerSim` gains `mana`, `manaMax`, per-slot cooldowns, packed consumables and `phaseUntil`. It reuses the `passMask` bits (`PASS_SQUAT`, `PASS_KID`, `PASS_LUGGAGE`) for Thunder Step, Spring Boots and Hover Skates.
- `CrowdSim` agents gain one **status struct**: `{ chillUntil, freezeUntil, dazeUntil, auraOffUntil, callOffUntil, lureUntil, lureX, lureZ, huddleUntil, linkOffUntil }`. Force code reads it: drive ×0 when chilled/dazed, rigid anchor when frozen, aura/noise skipped when off, brats steer to the lure, and couple-link suppression reuses the existing Split logic (`applyLinks`).
- Grid resolution is outside the sim: `resolveKit(set, gridTier, owned, catalog) → ActiveKit` (pure, in `src/game/techKit.ts`) validates footprints, the body rule and the active cap, then `modsFor()` turns the active list into `PlayerMods`. The sim never sees the grid.
- Determinism: target picking uses distance, then agent id; any randomness goes through the sim `rng`. No `Math.random`, no wall clock.
- New tuning groups in `TUNING`: `mage`, `spells`, `tech`, `items`, `economy` (coins), each with doc comments. They're live-editable via `?debug`, and `TUNE=` in `test:sim` deep-merges them.
- Boss hooks: `boss.counterDrainMul = 2.5`, `boss.disableMul = 0.5`. An ability tagged `counters: ['luggage']` applies the weak-point multiplier against that boss kind.

### 7.4 Effects pipeline

New sim events (`events.ts`) → `Game.ts` → `Effects` / `Audio` / `haptics`:

| Event | Render |
|---|---|
| `{t:'cast', ability, x,z,dx,dz, el}` | Element burst at the umbrella tip, wand orb colour |
| `{t:'status', agentId, kind, until}` | Per-instance tint (frozen = icy blue, chilled = pale, dazed = orbiting stars sprite); render reads agent status, sim never touches render |
| `{t:'chain', pts:[x,z][]}` | Lightning arc: pooled `THREE.Line` (≤ 4 live), jagged polyline rebuilt per cast |
| `{t:'gadget', id, x,z}` | Drone mesh / tablet glow / fan gust puffs / shield bubble |
| `{t:'coins', amount, kind}` (result screen only) | Coin count-up |

Quality tiers (`quality.ts`): Low uses fewer particles and no arc glow or bloom-ish sprites. **Gameplay is identical on every tier** (rule 7). Reduced-motion scales flashes/shake ×0.3.

### 7.5 Platform flag & entitlements · 平台旗標

**Build flag `VITE_PLATFORM=web|ios`** (✅ decided: the web build is a demo for friends with everything unlocked; paid locks only in the iOS app).

| | `web` (GitHub Pages / local dev) | `ios` (Capacitor App Store build) |
|---|---|---|
| Characters | All unlocked | Hero free; Mage/Tech need IAP (or the pack) |
| IAP code / plugin | Not bundled | Bundled (dynamic import) |
| Buy / Restore / Try UI | Hidden | Shown |
| Ads (AdMob) | None | Per §8.2 (off if any character or `noads` is owned) |
| Save | Same format; entitlement cache ignored | Entitlement cache + StoreKit truth |

```ts
// vite.config.ts: compile-time constant (dead-code eliminated)
define: { __PLATFORM__: JSON.stringify(process.env.VITE_PLATFORM ?? 'web') }

// src/game/platform.ts
export const PLATFORM: 'web' | 'ios' = __PLATFORM__;
// Fail closed: a native shell must never run the unlocked web mode.
export const IS_STORE_BUILD = PLATFORM === 'ios' || Capacitor.isNativePlatform();

// src/game/entitlements.ts (no plugin import at top level)
export interface Entitlements {
  owns(e: 'mage' | 'tech' | 'noAds'): boolean;
  products(): Promise<StoreProduct[]>;   // localized price strings
  buy(productId: string): Promise<BuyResult>;
  restore(): Promise<void>;
}
// WebDemoEntitlements: owns() → true for everything; products() → []; buy/restore unused (UI hidden)
// StoreEntitlements:   dynamic import() of the IAP plugin; used whenever IS_STORE_BUILD
export const entitlements = IS_STORE_BUILD ? await loadStoreEntitlements() : webDemoEntitlements;
```

- The default is `web`, so `pages.yml` and `npm run dev` need **no change**. The Capacitor script (`build:ios` → `VITE_PLATFORM=ios vite build && cap sync ios`) sets `ios`. 🛠️
- **Fail-closed guard:** if a native shell ever loads a `web` bundle, `IS_STORE_BUILD` is still true, so the locks apply and a console warning is logged. A CI check asserts that the `ios` bundle contains no `WebDemoEntitlements` code path. There's no URL parameter or hidden toggle that unlocks anything in the iOS build (guidelines 3.1.1 and 2.3.1(a), §8.3).
- Web and iOS saves are separate (different storage), so nothing unlocked on the web carries into the app.

### 7.6 Balance bot support (`scripts/simTest.ts`)

- New env `CHARS=hero,mage,tech` (default `hero`, so today's output is unchanged).
- Loadout names gain a character prefix: `mage:earned`, `mage:b:60/30/10+fire`, `mage:ult-ice`, `tech:earned` (coins = first clears + 50 % ⚡ assumed, greedy shop policy from §5.6), `tech:kit:S3@3,G2@3,H1@2,D3@3,D4@2,C2@1` (validated against the 6-cell bag; a piece that does not fit beside the others is left unpacked), `tech:grid4` (name kept; it is the 6-cell bag, not 16), `tech:max`. The shop policy expands at most once (2×2 → 2×3, when coins ≥ 150 + a 150 reserve) and uses auto-pack.
- Bot ability policy (generic, data-driven): fire a counter ability when a matching special or boss is in the 60° forward cone within range and the resource is ready. Fire the general ability (Fire Bolt / Zap / Turbo Fan) when blocked (speed < 0.3 m/s for 0.5 s). Ult same as the Hero today. Consumables when stamina < 30 % or a matching special is near.
- Report: the per-level table adds **Δ vs hero** columns and flags |Δ| > 10 pp in red. Targets are reported, not enforced, as today.
- Counter micro-scenarios: one scripted scenario per new counter node/item (with vs without), like the existing Hurdle/Leap/Split checks.

### 7.7 Test plan

| Area | Check | Gate |
|---|---|---|
| Hero regression | Same seeds → identical win/time JSON before vs after the abstraction refactor | **Must pass** (golden) |
| Determinism | Each character, same seed twice → identical | Must pass |
| Counters | 12 Mage + 12 Tech micro-scenarios show the effect | Must pass |
| Economy | Coin derivation (incl. grid spend), 5-replay cap, ⚡ once, retro grant once, item sell-back 100 %, expansions non-refundable, over-spend refund notice | Must pass |
| Grid | Shape masks + 4 rotations for every polyomino (`I3`…`X5`), bitmask collision, overlap/out-of-bounds rejection, body rule, active cap, downsizing to owned lower tier, expansion keeps placements, invalid set normalisation, deterministic auto-pack | Must pass |
| Save | Old v0.7 save → new defaults, Hero untouched; corrupt fields normalised; round-trip of sets/spell bars | Must pass |
| Gating | iOS build: locked char can't be selected, trial gives no rewards, refund re-locks + falls back to Hero. Web build: all unlocked, no IAP/ads code in the bundle. Native shell + web bundle → still locked (fail-closed) | Must pass |
| Parity | Bands per §1.3 at `RUNS=40`; L100 per character best build | Reported; owner decides retunes |
| Perf | ms/step with 3 actives + statuses on 96 bodies ≤ today +10 % | Reported |
| UI | Screenshots of char select, spellbook, workshop, 3 HUDs, trial banner (EN + 粵, 390×844 + Dynamic Island sim) | Reviewed by agent + owner |
| IAP (🛠️ device) | StoreKit config: buy, cancel, restore, Ask to Buy pending, refund (Xcode transaction manager), offline launch, reinstall + restore; sandbox tester on iPhone | Must pass before submit |

---

## 8. Monetisation · 收費

### 8.1 Products (all non-consumable) 🎛️ 👤

| Product id (neutral) | Grants | USD | HKD (≈, use the nearest ASC price point) |
|---|---|---|---|
| `exitrush.char.mage` | Mage | 2.99 | ≈ 23 |
| `exitrush.char.tech` | Tech | 2.99 | ≈ 23 |
| `exitrush.pack.chars` | Mage + Tech | 4.99 | ≈ 38 |
| `exitrush.noads` | Remove interstitials | 2.99 | ≈ 23 |

- Apple has no "IAP bundle" type. The pack is its own non-consumable that grants both entitlements (RevenueCat: products → entitlements `mage`, `tech`, `noAds`). **Hide the pack once either character is owned.** Show only the remaining single, so no one pays twice.
- **✅ Decided: any character purchase also removes interstitials** (supporter goodwill). Rewarded ads stay available and opt-in. `noads` stays for people who only want that.
- Prices always come from StoreKit at runtime (`localizedPriceString`), never hard-coded, matching APP_STORE.md §E.
- No subscriptions, no consumable IAP, no coin packs, no gacha.

### 8.2 Ads interaction (from APP_STORE.md §E)

| Ad | Rule with characters |
|---|---|
| Rewarded: revive once / +3 s door time | Same for all characters. Not usable in trial runs |
| Rewarded: "double SP on first clear" (optional idea in §E) | **Drop it.** It breaks SP parity, and a Tech equivalent would break the bounded-coin rule. Never offer coins/SP for ads |
| Interstitial | Rules unchanged (≤ 1 per 2–3 level ends, never before the first win, never right after a rewarded ad). **Off** if the player owns any character or `noads`. Never on the character-select or shop screens |
| Upsell | Character offer shown at most once per session, after a win (never after a loss), plus naturally at L6 / L20 trial unlocks |

Release order (per APP_STORE.md): v1.0 ships free with no IAP. **Characters land in 1.1 together with ads/Remove Ads**, so the Paid Apps Agreement, privacy label update and IAP review happen once.

### 8.3 Apple requirements (verified 2026-10-06 against the App Review Guidelines, "Last Updated: June 8, 2026": <https://developer.apple.com/app-store/review/guidelines/>)

| Guideline | What it says (paraphrased) | What we do |
|---|---|---|
| **3.1.1 In-App Purchase** | Unlocking features or game content must use IAP. Apps may not use their own unlock mechanisms (license keys, QR codes…) | Characters are IAP only in the iOS build. No promo-code/QR/URL unlock; the web-demo unlock is compiled out (`VITE_PLATFORM=ios`, §7.5) |
| **3.1.1** | IAP currencies may not expire; provide a **restore mechanism** for restorable IAPs | **恢復購買 Restore Purchases** on the character select screen + Settings. We sell no currency |
| **3.1.1** | Loot boxes must disclose odds | N/A: nothing randomised is sold; state it in review notes |
| **3.1.1** | Non-subscription apps may offer a time-based free trial via a tier-0 non-consumable named "XX-day Trial" with clear disclosures | Not used. Our trial is the in-game Trial Car (level-limited, no expiry, no rewards) |
| **2.1(b)** | IAPs must be complete, visible to the reviewer and functional; explain any that can't be found | Review notes: where to find 揀角色 + 試玩, plus a sandbox purchase path |
| **2.3.2** | Description/screenshots must say which items/levels need extra purchases | Store description line: 「魔法師及高科技人為額外付費角色；全部 100 關可用免費主角通關。」 Paid-character screenshots labelled |
| **2.3.1(a)** | No hidden/dormant features; describe new features specifically in review notes | Web-demo unlock not present in the iOS bundle; review notes list both characters + the shop |
| **3.2.2(x)** | Apps may incentivise actions like watching an ad | Rewarded revive/+3 s are fine |
| **2.5.18** | Ads must fit the age rating, have visible close buttons and a way to report ads | Unchanged from APP_STORE.md §E |
| **5.6 Developer Code of Conduct** | No manipulative practices or tricking users into purchases | No fake timers, no "limited offer" pressure, no nag after a loss |
| Before You Submit | Explain non-obvious features and IAPs in review notes | F9 notes get a "Characters & IAP" paragraph (draft in §8.5) |

**Family Sharing** (App Store Connect Help, <https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases>): non-consumables can be shared with up to 5 family members. It's a per-product toggle in ASC that **can't be turned off once on**. Recommendation (assumed unless Kingsley objects; **confirm before toggling, it's irreversible**): turn it on for the character products (family-friendly, good reviews), and show 「可家人共享」 in the store card using `isFamilyShareable`. StoreKit/RevenueCat handle shared transactions automatically.

**Plugin** (per APP_STORE.md §E; re-check versions when implementing): RevenueCat `@revenuecat/purchases-capacitor` (entitlements, restore, refund handling, analytics; recommended now that there are 4 products and 3 entitlements) **or** StoreKit 2 via `@capgo/native-purchases`. Use a StoreKit configuration file for Simulator tests and a Sandbox tester on device. The Paid Apps Agreement + banking/tax in ASC is required first (👤).

### 8.4 Web / GitHub Pages build · 網頁試玩版 (✅ decided)

- **The web build is a free demo for friends: everything is unlocked** (all three characters; Tech shop and grid fully usable with earned coins). It has **no IAP, no ads, no prices, and no Buy/Restore/Try UI**.
- Controlled by `VITE_PLATFORM=web` (the default; `pages.yml` unchanged) vs `ios` (§7.5). Paid locks exist only in the iOS app build.
- Native-only IAP/ads code is behind the platform flag + dynamic import, so the web bundle doesn't grow.
- **Keep the free web demo out of the iOS app and its metadata:** no link or mention of "play free on the web" in the app, the App Store description or the IAP descriptions. That avoids any reading as a way around in-app purchase (3.1.1 / 3.1.3 calls to action). Linking *from* the web demo *to* the App Store is fine.
- The repo is public, so anyone can build an unlocked copy. Accepted: the web demo is unlocked anyway.

### 8.5 Review-notes paragraph (draft for 👤 to paste into ASC)

> Exit Rush offers two optional non-consumable in-app purchases that add playable characters (Mage, Tech), a pack of both, and Remove Ads. All 100 levels can be completed with the free default character. To review: Title → 角色/Characters → swipe to a paid character → "Try" plays a free trial level; "Buy" starts the StoreKit purchase; "Restore Purchases" is on the same screen and in Settings. Tech's in-game coins are earned only by playing and cannot be bought. Nothing is randomised.

---

## 9. Art & audio needs · 美術及音效

Concepts can be generated with **Grok Image** and processed by `scripts/art/build_art.py` (AGENTS.md rule 4: original assets only, nothing that resembles any real railway's marks). In-game models stay code-built low-poly.

| # | Asset | Kind | Notes | Who |
|---|---|---|---|---|
| A1 | Mage concept sheet (front/back/top-down, 3 element orb states) | Grok Image | Umbrella wand, hood, violet palette | 🤖 gen → 👤 approve |
| A2 | Tech concept sheet + equipped variants (visor/helmet, gloves, shoes, backpack add-ons) | Grok Image | Electronics-market geek, hoodie, LED visor | 🤖 → 👤 |
| A3 | Low-poly `Spec` looks in `characters.ts` for Mage + Tech (+ 6 equipment sub-parts) | Code | One merged geometry per look / kit hash | 🤖 |
| A4 | Character-select portraits ×3 + card backgrounds | Grok Image → WebP strip | Like `portraits.webp` | 🤖 → 👤 |
| A5 | 21 spell node icons (18 nodes + 3 ults) | SVG in `icons.ts` | Bold rounded glyphs, element colour rings | 🤖 |
| A6 | 20 shop item icons, drawn per tier to fill its footprint (平 `O1`, 中價 `I2`, 名貴 irregular `I3`/`L3`/`L4`/`T4`/`S4`/`Z4`/`U5` silhouettes; `I4` and `X5` are not sold; the 名貴 art gets bigger and fancier) + 6 slot glyphs + coin 💰 + ✦ weak-point | SVG | Same icon language | 🤖 |
| A6b | Backpack grid art: cell frame, locked 🔒 expansion cells, green/red ghost footprint, rotate ⟳ glyph | SVG/CSS | | 🤖 |
| A7 | VFX: fire bolt trail, flame burst ring, ember puffs | Particles (pooled) | Additive orange; Low tier = half count | 🤖 |
| A8 | VFX: frost cone, ice shards, frozen tint, Ice Age dome | Particles + instance tint | | 🤖 |
| A9 | VFX: lightning chain arcs, dazed stars, Thunder Blink afterimage | Pooled lines + sprites | | 🤖 |
| A10 | Gadget props: drone, tablet glow, fan gust, force field bubble, mech arms, jet pack flame | Low-poly + particles | | 🤖 |
| A11 | Store art: IAP promo images (1024×1024, 4+ appropriate per 2.3.8), updated screenshots showing paid characters labelled | Grok Image + captures | | 🤖 → 👤 |
| S1 | SFX: fire whoosh, burst boom, ice crackle/ping, freeze shatter, zap/thunder crack, mana-empty buzz | Web Audio synth | `Audio.ts` sfx bus | 🤖 |
| S2 | SFX: shop buy 「叮！」, upgrade, sell, equip click, coin count-up, drone buzz, tablet cartoon jingle (original) | Web Audio synth | | 🤖 |
| S3 | Character select stingers ×3 | Web Audio synth | Short, original | 🤖 |

---

## 10. Phased implementation plan · 分階段實行

| Phase | Work | Who | Done when |
|---|---|---|---|
| **P0** Decisions | Answer the open questions (§11): names, prices, mana model, Family Sharing, ad tie-in | 👤 | Owner sign-off on this doc |
| **P1** Abstraction | `CharacterDef`, `TreeDef` (Hero ported 1:1), `PlayerMods`, `abilities.ts` registry, save fields + `normalizeSave`, `VITE_PLATFORM` flag + `Entitlements` interface + `WebDemoEntitlements` (all unlocked) | 🤖 box agent | **Hero golden test identical**; build + test:sim green |
| **P2** Mage | Mana, 18 nodes + 3 ults in sim, agent status struct, spellbook UI re-theme + spell bar, HUD, VFX/SFX, bot policy + 12 micro-scenarios, parity report | 🤖 | Parity report attached to the PR; screenshots EN/粵 |
| **P3** Tech | Coin ledger + derivation, 20-item 平/中價/名貴 catalogue, **backpack grid** (`techKit.ts` resolver, drag/rotate/tap-to-place UI, auto-pack, expansions), workshop UI (equip/shop/sets), HUD, kit render variants, bot shop + expansion policy + scenarios | 🤖 | Same + grid tests |
| **P4** Shell | Character select, trial car + preset builds, "cleared with" marks, onboarding cards, upsell rules, ✦ boss counters per character | 🤖 | Screens reviewed |
| **P5** Balance | `RUNS=40 CHARS=hero,mage,tech` across L1–100; propose retunes (tuning only in `TUNING.mage/spells/tech/items/economy`) | 🤖 proposes, 👤 approves | All bands within ±10 pp, or owner accepts the deltas |
| **P6** Native IAP | RevenueCat (or native-purchases) plugin, `NativeEntitlements`, StoreKit config file, Restore, refund/revoke handling, Ask-to-Buy pending UI, device sandbox tests | 🛠️ Kingsley's local Grok Build (Node 22, Xcode) | §7.7 IAP rows pass on iPhone |
| **P7** ASC | Paid Apps Agreement/tax/banking, create 4 non-consumables (ids §8.1), price points, Family Sharing toggles, IAP display names/descriptions/review screenshots (EN + 繁中), RevenueCat project + keys (never committed), sandbox testers | 👤 owner (keys only on Kingsley's machine) | Products "Ready to Submit" |
| **P8** Store & submit | Update description (2.3.2 line), screenshots, privacy label if RevenueCat/ads added, review notes §8.5, TestFlight round | 🤖 drafts, 👤 submits | 1.1 approved |

Branching: work on feature branches with PRs (`feat/v0.8-characters-*`), never directly on `main` (it auto-deploys Pages). Characters target the release after v0.7.0. **Nothing in this plan touches the v0.7.0 work in progress.**

---

## 11. Decisions (6 Oct 2026) · 已決定

| # | Topic | Decision |
|---|---|---|
| D1 | Names | Mage = **「凱婷」**; Tech = **「裝備L」** / **Gear L** (see D9). Hero → D8, Mage EN name → D10 |
| D2 | Prices | **US$2.99** per character, **US$4.99** pack of both, **US$2.99** Remove Ads (HKD ≈ 23 / 38 / 23; take the nearest ASC price points) |
| D3 | Mana | Mana **alongside** stamina (separate bar) |
| D4 | Item shapes | Stronger = less square / more irregular: **平 1×1, 中價 1×2, 名貴 = awkward polyomino** (line, L, T, S/Z, U, plus); 90° rotation; cell mask + bitmask collision (§5.4.2) |
| D5 | Consumables | Take grid space (1×1 each, max 3). No separate pocket |
| D6 | Ads | Buying **any** character also removes interstitials. Rewarded ads stay opt-in |
| D7 | Web | GitHub Pages/web = **demo for friends, everything unlocked**, no IAP, no ads. Paid locks only in the iOS build via `VITE_PLATFORM=web\|ios` (§7.5, §8.4) |
| D8 | Hero name | **「上班族」**, EN **Office Worker** (the free protagonist, called "Hero" in technical sections) |
| D9 | Tech name | Keep **「裝備L」 / Gear L** as is |
| D10 | Mage EN name | **Bad Girl** (an English name, not a romanisation of 凱婷) |
| D11 | Tech item tier labels | **平 / 中價 / 名貴** (EN: **Cheap / Mid / Luxury**). Replaces earlier 細/中/傳說 (S/M/LG). Code still uses numeric tiers 1/2/3; player-facing copy uses the new labels |
| D12 | Level progress | **Separate per character** (replaces shared progress). Unlocks, best clears, boss cutscenes, and SP/coins derive from that character's own first clears |

**Assumed per recommendation unless Kingsley objects:**

| # | Topic | Assumption |
|---|---|---|
| A1 | Tech progression | Coins only (no SP); core/ult unlocks at L70 |
| A2 | Grid prices | 2×2 free → 2×3 for 150. That is the last expansion (7 Oct 2026). The old 3×3 / 3×4 / 4×4 prices are gone |
| A3 | Expansions | Permanent and non-refundable; items keep 100 % sell-back |
| A4 | Rewarded ads | No "double SP" ad; no ad ever grants SP or coins (revive / +3 s only) |
| A5 | Family Sharing | Turn on for character IAPs (**irreversible: get Kingsley's explicit OK before toggling in ASC**) |
| A6 | Extra levels | None for paid characters; cosmetic "cleared with" marks only |
| A7 | Trial (iOS only) | Trial Car on L6 + L20 with preset builds, no rewards |
| A8 | Release | Characters ship in 1.1 together with ads/Remove Ads |
| A9 | IAP library | RevenueCat (`@revenuecat/purchases-capacitor`) |
| A10 | Looks | Mage = umbrella-wand commuter in a hood; Tech = hoodie + LED visor + antenna backpack |
| A11 | Parity | ±10 pp per level band vs the Hero; paid characters not deliberately easier |

## 12. Open questions for Kingsley · 待決問題

None open (6 Oct 2026). The items in §11 marked "assumed per recommendation" stand unless Kingsley objects. Family Sharing (A5) still needs his explicit OK before it's switched on in App Store Connect, because it can't be undone.
