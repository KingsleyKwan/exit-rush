# Levels draft — stations & difficulty

Difficulty is a composite of **density** (0–10), **pressure** (boarding spawn), **special mix**, and **timer seconds**. v0.2.1: all of 1–20 + 100 are tuned with the headless sim (pressure and mix live in `src/game/levels.ts`; see [`BALANCE.md`](BALANCE.md)). Density alone is not difficulty — luggage-heavy and boarding-wave levels use lower density.

Station names below are **parody display names** (香城鐵路 fiction). Real→parody mapping: [`STATIONS.md`](STATIONS.md).

**Level 100** is fixed as the hardest fantasy beat: **頓沙嘴 · 十一煙花後** (Dun Sha Mouth after fireworks).

Levels **21–99** are **TBD** (repeat motifs with escalating modifiers, branch lines, typhoon days, etc.).

| Lv | Station EN | 站名 | Time / flavour | Density | Timer (s) | Notes |
|----|------------|------|----------------|---------|-----------|-------|
| 1 | Sheung Yuen | 上圓 | Mid-morning quiet | 10 | 36 | Packed car, few boarders (tutorial); mostly normals |
| 2 | Bastion Hill | 堡壘山 | Lunch trickle | 6 | 38 | +luggage |
| 3 | Gu Ching | 古城 | After-school | 10 | 37 | +brat |
| 4 | Koi Stream | 鯉魚涌 | Office spill | 8 | 37 | +angry |
| 5 | North Spot | 北點 | Evening peak start | 5 | 40 | Mix + family |
| 6 | Causeway Bay Village | 銅鑼灣村 | Weekend shoppers | 6 | 36 | Luggage heavy |
| 7 | Tin Wong | 天王 | Temple fair spill | 9 | 37 | Stench + family |
| 8 | Wan Neoi | 灣女 | Conference let-out | 8 | 39 | Couples + angry |
| 9 | Silver Bell | 銀鐘 | Cross-platform crush | 8 | 40 | High pressure |
| 10 | Central Yuen | 中圓 | Fri 18:30 | 8 | 40 | Classic peak |
| 11 | Hong City | 香城 | Express transfer vibe | 7 | 41 | Luggage max |
| 12 | Nine-Head Dragon | 九頭龍 | Tourist wave | 6 | 39 | Couples + luggage |
| 13 | Aa Wan | 亞運 | Concert let-out | 9 | 42 | Angry spike |
| 14 | Mong Gok | 望角 | Sat night | 8 | 45 | All types |
| 15 | Gong Jyu | 公主 | Calm→surge* | 9 | 48 | *fictionalised surge only |
| 16 | Yam Chow | 欽洲 | Market close | 8 | 40 | Stench + family |
| 17 | Lai Chi Gok | 荔枝角 | Typhoon signal eve | 7 | 37 | Pressure up |
| 18 | Chuen Jik | 荃直 | Terminal dump | 8 | 45 | Boarding wall |
| 19 | Maan Gwok | 萬國 | Through-train fantasy | 7 | 45 | Luggage + angry |
| 20 | Dun East | 頓東 | Pre-fireworks | 10 | 50 | Dress rehearsal for 100 |
| … | *TBD* | | | | | Levels 21–99 |
| **100** | **Dun Sha Mouth** | **頓沙嘴** | **十一煙花後** (post-fireworks) | **10** | **28** | Hardest: max density, pressure 1.6 surge, angry + luggage heavy; balanced for ~99 pts incl. one ultimate |

\* Narrative flavour only; keep content respectful and non-political in shipped copy.

## Implementation mapping (code)

`src/game/levels.ts` encodes levels 1–20 and 100 with density/timer/mix/pressure. Spawn tables are data-driven for all of them. Levels 21–99 remain TBD.

## Remaining work

See [`GAME_DESIGN.md`](GAME_DESIGN.md) roadmap.
