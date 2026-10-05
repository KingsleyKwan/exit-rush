# Levels — stations & difficulty (v0.6.1)

Difficulty is a composite of **density** (0–10), **pressure** (boarding), **special mix**, and **timer seconds**. v0.6 retunes for **~10–15 s** exits with a **complexity staircase**: L1–5 normals only; one special introduced every three levels from L6; mixes on L24–30; L100 finale.

Station names are **parody display names** (香城鐵路 fiction). Real→parody mapping: [`STATIONS.md`](STATIONS.md).

**Level 100** unlocks after clearing **level 30**. Fantasy beat: **頓沙嘴 · 十一煙花後**.

| Lv | Station EN | 站名 | Sec | Dens | Press | Special / role |
|----|------------|------|-----|------|-------|----------------|
| 1 | Sheung Yuen | 上圓 | 14 | 6 | 0.08 | Normals — teach drag |
| 2 | Bastion Hill | 堡壘山 | 13 | 6 | 0.1 | Normals — shove |
| 3 | Gu Ching | 古城 | 13 | 6 | 0.15 | Normals — boarders |
| 4 | Koi Stream | 鯉魚涌 | 12 | 7 | 0.2 | Normals — stamina |
| 5 | North Spot | 北點 | 12 | 7 | 0.25 | Normals — door warning |
| 6 ★ | Causeway Bay Village | 銅鑼灣村 | 14 | 5 | 0.25 | **Intro luggage** |
| 7 | Tin Wong | 天王 | 13 | 6 | 0.34 | Reinforce luggage |
| 8 ★ | Wan Neoi | 灣女 | 15 | 6 | 0.32 | **Intro squat / 踎低** |
| 9 ★ | Silver Bell | 銀鐘 | 14 | 5 | 0.3 | **Intro stench** |
| 10–11 | Central Yuen / Hong City | 中圓 / 香城 | 13–14 | 6 | 0.25–0.35 | Reinforce / soft combine |
| 12 ★ | Nine-Head Dragon | 九頭龍 | 14 | 5 | 0.35 | **Intro family** |
| 13–14 | Aa Wan / Mong Gok | 亞運 / 望角 | 13–14 | 6–7 | 0.4–0.45 | Reinforce family |
| 15 ★ | Gong Jyu | 公主 | 14 | 6 | 0.4 | **Intro brat** |
| 16–17 | Yam Chow / Lai Chi Gok | 欽洲 / 荔枝角 | 13–14 | 6–7 | 0.45–0.5 | Reinforce brat |
| 18 ★ | Chuen Jik | 荃直 | 15 | 6 | 0.45 | **Intro couple** |
| 19–20 | Maan Gwok / Dun East | 萬國 / 頓東 | 14–15 | 7 | 0.5–0.55 | Reinforce couple |
| 21 ★ | Yuen Kwok | 元國 | 15 | 6 | 0.5 | **Intro angry** |
| 22–23 | Long Ping Flat / Sheung Yuen | 塱平 / 上圓 | 14–15 | 7 | 0.55–0.6 | Reinforce angry |
| 24–30 | Mix exams → act boss | (reused stations) | 15–18 | 7–9 | 0.6–0.9 | Combinations |
| **100** | **Dun Sha Mouth** | **頓沙嘴** | **24** | **10** | **1.5** | All types · fireworks |

★ = intro card before timer. Full copy: design plan in repo review docs / `src/game/intros.ts`.

## Skill points (v0.6)

First clear of each playable level awards **3** skill points. Replays award **0**.  
31 playable levels × 3 = **93** SP reachable — enough for one full branch + ultimate (70) and a strong L100 loadout. See [`BALANCE.md`](BALANCE.md).


## Teach order (v0.6)

| Level | Intro |
|------:|-------|
| 6 | luggage |
| **8** | **squat / 踎低** |
| 9 | stench |
| 12 | family |
| 15 | brat |
| 18 | couple |
| 21 | angry |

L24 tip reinforces squat in a mix exam.

## Open door bays (v0.6.1)

Side-door bays on the left (−X) wall at Z −2.6 / 0 / 2.6:

| Levels | Open bays | Notes |
|--------|-----------|--------|
| 1–7 | 3 | All open |
| 8–15 | 2 | Mid + near (Z 0, 2.6); far bay stays shut |
| 16–30 / 100 | 1 | Mid only (Z 0) |

Closed bays keep leaves shut, show a red indicator + 「此門不開」 sign, and toast if the player pushes them.
