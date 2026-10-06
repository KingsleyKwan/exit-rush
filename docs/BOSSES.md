# Bosses — 八王 (v0.7.0)

Every 10th level from **L20 to L90** is a **boss level**: one oversized "king" of a special-passenger type stands between you and the exit. These replace the old *exam* levels at 20/30/…/90 (station names unchanged). **L99** keeps the final exam, and **L100 頓沙嘴** puts **all eight kings** in one car.

Data: `src/game/bosses.ts` (names, taglines, colours, counters) · numbers: `TUNING.boss` in `src/game/sim/tuning.ts` · sim: `CrowdSim.spawnBosses / updateBosses` · view: `Passenger.ts` (crown, ring, tag, bar) · cutscene: `Game.ts` (`'boss'` screen) + `renderUI.ts › renderBossCut`.

## The kings

| Lv | Station | Type | 粵 | EN | Exaggerated mechanic | Counter (skill tree) |
|---:|---------|------|----|----|----------------------|----------------------|
| 20 | Dun East 頓東 | luggage | **行李箱大王** | Suitcase King | Giant suitcase (r ×2.4, mass ×3) parked in the doorway; running into it **bounces you back** (impulse 2.8, 0.6 s cd) | **跨行李 Hurdle** (no contact with the case, no bounce) · 震地 Ground Pound |
| 30 | Wan Neoi 灣女 | stench | **臭狐王** | Stink Fox King | Huge stench aura (×1.5 radius × body scale) — heavy slow across the vestibule | **忍臭 Hold Breath** |
| 40 | Short Sand Bay 短沙灣 | squat | **踎低王** | Squat King | Big squatter right inside the door; wide weave-drag zone | **飛身 Leap** · 蓄力一推 Charged Shove |
| 50 | Gem Hill 寶石山 | family | **大家長** | The Patriarch | Spawns a **trail of kids** (one every 2.4 s, max 6) that clog the aisle behind him | **好脾氣 Unbothered** · 飛身 Leap |
| 60 | Po Chi Lam 寶之林 | brat | **衰仔王** | Brat King | **Dashes** at you every 1.25 s inside 2.8 m and **bumps** (impulse 3.4) | **回魂 Second Wind** (knocks him back + daze) |
| 70 | City Two 第二城 | couple | **黏身情侶王** | Clingy Couple Royals | Two big royals holding hands **across the aisle** — the hand-hold is a rope barrier (rest 1.2 m, force ×3) | **穿插 Thread** · 拆散情侶 Split |
| 80 | Siu Gin 兆健 | angry | **嬲嬲豬王** | Grumpy Hog King | Range ×1.6, winds up then **charges**; shove impulse ×1.8 ignores 65 % of non-Stand-Firm resistance and stuns longer | **頂硬上 Stand Firm** |
| 90 | Fan Hill 粉山 | loud | **大聲公王** | Loudmouth King | Huge noise zone (radius × body scale) draining stamina across the car | **好脾氣 Unbothered** (noise drain ×0.3) |
| 100 | Dun Sha Mouth 頓沙嘴 | all | **八王齊集** | All Eight Kings | All eight kings (scale 1.4) as a gauntlet from door to platform | Ultimates + any counters |

Note: the brief wrote 「嬬嬬豬王」 for the angry king; the game uses **嬲嬲豬王** (嬲 = angry in Cantonese), which looks like the intended word.

## A boss is an obstacle, not an enemy

The run is still *exit before the doors close*. A king is **not defeated**. He's **worn down**:

- **Body:** scale ×1.75 (×1.4 at L100), radius ×1.5, mass ×3.2, home anchor ×1.9. Kings ignore boarding pressure, drift and sidestep, so they hold their spot.
- **Stubbornness bar (「牛脾氣」條)**, framed gold above the name tag:
  - **Leaning into him** drains it at 0.26/s × your push force (STR helps), ×5 while charging. Pushing the luggage case or the royal hand-hold also counts.
  - **Shove hits** drain 0.2 each.
  - After 0.8 s with no contact he **regains** 0.06/s.
- At **0** he **yields**: he steps aside perpendicular to your aim (×1.15 m), his mechanic pauses, the anchor drops to 0.25, the bar flashes green and you get the toast 「佢讓路喇，衝！ / He yields — go!」. This lasts **3.2 s**, then he slowly rebuilds his resolve.
- **Counters** make him easier to get past without wearing him down (hop the case, leap the squatter, thread the royals, stand firm against the hog). Each counter has a micro-test in `npm run test:sim`.

## Visual identity

- Gold **crown** (sits on top of the luggage sun hat / brat cap), a per-type **tint**, and a gold **floor ring**.
- A **name tag** sprite shows 粵 + EN with a crowned type-colour badge. The **stubbornness bar** sits above the crown (red-orange → green while yielding).
- Type badges are hidden on kings: the crown is the badge.
- At L100 only the **nearest king** within 3 m shows his tag and bar, so the car doesn't drown in labels.
- **Level select:** boss tiles have a gold inset border plus a crown pill with the king's name. The clear ✓ moves to the bottom-right corner on pill tiles (boss / 大考).

## Entrance cutscene

When a boss level starts, the game enters the `'boss'` screen before the intro/timer:

1. Letterbox bars slide in. The camera blends from the overview to a low close-up on the king (`TrainScene.follow(…, focus)`), who turns to face the camera.
2. At the **slam** there is a stomp puff, camera trauma and a thud.
3. A title card rises: kicker 「頭目 · 關卡 N / Boss · Level N」, the big 粵 name, the EN name, the tagline and a ★ counter line. L100 shows 「八王齊集 / All Eight Kings」 with a row of eight tinted crowns.
4. **Tap anywhere to skip** (「輕按略過 / Tap to skip」).

**Length:** **2.6 s** the first time you meet that boss level and **1.1 s** after that (`save.seenBosses`). The timer doesn't run during the cutscene.

## Timers & balance

Boss levels get a longer timer (tune.py cap 28 s and floor 18 s for bosses, vs 14–24 s for ordinary levels). Win rates below come from the bot with the **earned build** for that level (1 SP per first clear, spread over the band's main branch), 60 runs, deterministic seeds:

| Lv | Boss | Sec | Dens | Press | Earned clear | Band |
|---:|------|----:|-----:|------:|-------------:|------|
| 20 | Suitcase King | 20 | 8 | 0.47 | 65 % | 55–75 % |
| 30 | Stink Fox King | 28 | 10 | 0.39 | 58 % | 55–75 % |
| 40 | Squat King | 28 | 9 | 0.35 | 53 % | 50–70 % |
| 50 | The Patriarch | 20 | 9 | 0.73 | 53 % | 50–70 % |
| 60 | Brat King | 18 | 9 | 0.98 | 68 % | 50–70 % |
| 70 | Clingy Couple Royals | 21 | 9 | 0.80 | 53 % | 35–60 % |
| 80 | Grumpy Hog King | 17 | 9 | 0.98 | 40 % | 35–60 % |
| 90 | Loudmouth King | 21 | 9 | 0.92 | 38 % | 35–60 % |
| 100 | All Eight Kings | 30 | 8 | 0.90 | ult-str 26 % · ult-spd 45 % · ult-sta 34 % · 20-pt 0 % | ult 30–50 %, 20-pt 0–5 % |

**What each counter is worth.** These are clear rates at the skill's threshold build vs one point below it (same total points):

| Lv | Counter | Without → with |
|---:|---------|----------------|
| 20 | Hurdle | 64 → 71 % |
| 30 | Hold Breath | 37 → 55 % |
| 40 | Leap | 53 → 77 % |
| 50 | Leap / Unbothered | 85 → 95 % / 35 → 50 % |
| 60 | Second Wind | 89 → 94 % |
| 70 | Thread | the royal hand-hold is a hard barrier without it (test: held at x −0.28 vs through to −3.10 in 1.6 s) |
| 80 | Stand Firm | 56 → 63 % |
| 90 | Unbothered | 32 → 42 % |

**Economy caveat:** at 1 SP per level, the T3 counters (40/50/60 points in a branch) aren't reachable on a *first* attempt at L20–L50. Early kings are tuned to be beatable by wearing them down. Counters pay off on replays, with respecs and loadouts, and from L60 on.

**L100 ult-str** sits at 26 % (band 30–50 %; v0.6.3 was 12 %). The STR ultimate wears kings down fastest but still loses time in the door/platform crush. Pressure, timer and density sweeps couldn't lift it without pushing ult-spd over 50 %.

## Tests (`npm run test:sim`)

- `Boss levels`: L20–90 each spawn exactly their king, and L100 spawns all eight.
- `Boss stubbornness → yield`: leaning drains the bar, he yields and steps aside, and the bar regenerates.
- `Hurdle vs Suitcase King`, `Thread vs Couple Royals`, `Stand Firm vs Hog King`: each counter vs no counter.
- `Second Wind / Loud King`: Second Wind dazes the Brat King, and the Loud King's noise reaches 1.5× a normal loudmouth's radius.
- `Save seenBosses`: normalised and persisted.
