# Levels draft — stations & difficulty

Difficulty is a composite of **density** (0–10), **pressure** (boarding spawn), **special mix**, and **timer seconds**. v0.2.1: all of 1–20 + 100 are tuned with the headless sim (pressure and mix live in `src/game/levels.ts`; see [`BALANCE.md`](BALANCE.md)). Density alone is not difficulty — luggage-heavy and boarding-wave levels use lower density.

**Level 100** is fixed as the hardest fantasy beat: **Tsim Sha Tsui after fireworks (十一煙花後尖沙嘴)**.

Levels **21–99** are **TBD** (repeat motifs with escalating modifiers, branch lines, typhoon days, etc.).

| Lv | Station EN | 站名 | Time / flavour | Density | Timer (s) | Notes |
|----|------------|------|----------------|---------|-----------|-------|
| 1 | Sheung Wan | 上環 | Mid-morning quiet | 10 | 36 | Packed car, few boarders (tutorial); mostly normals |
| 2 | Fortress Hill | 炮台山 | Lunch trickle | 6 | 38 | + luggage |
| 3 | Tai Koo | 太古 | After-school | 10 | 37 | +brat |
| 4 | Quarry Bay | 鰂魚涌 | Office spill | 8 | 37 | +angry |
| 5 | North Point | 北角 | Evening peak start | 5 | 40 | Mix + family |
| 6 | Causeway Bay | 銅鑼灣 | Weekend shoppers | 6 | 36 | Luggage heavy |
| 7 | Tin Hau | 天后 | Temple fair spill | 9 | 37 | Stench + family |
| 8 | Wan Chai | 灣仔 | Conference let-out | 8 | 39 | Couples + angry |
| 9 | Admiralty | 金鐘 | Cross-platform crush | 8 | 40 | High pressure |
| 10 | Central | 中環 | Fri 18:30 | 8 | 40 | Classic peak |
| 11 | Hong Kong | 香港 | Airport Express transfer vibe | 7 | 41 | Luggage max |
| 12 | Kowloon | 九龍 | Tourist wave | 6 | 39 | Couples + luggage |
| 13 | Olympic | 奧運 | Concert let-out | 9 | 42 | Angry spike |
| 14 | Mong Kok | 旺角 | Sat night | 8 | 45 | All types |
| 15 | Prince Edward | 太子 | Protest-era memory calm→surge* | 9 | 48 | *fictionalised surge only |
| 16 | Sham Shui Po | 深水埗 | Market close | 8 | 40 | Stench + family |
| 17 | Mei Foo | 美孚 | Typhoon signal eve | 7 | 37 | Pressure up |
| 18 | Tsuen Wan | 荃灣 | Terminal dump | 8 | 45 | Boarding wall |
| 19 | Hung Hom | 紅磡 | Through-train fantasy | 7 | 45 | Luggage + angry |
| 20 | East Tsim Sha Tsui | 尖東 | Pre-fireworks | 10 | 50 | Dress rehearsal for 100 |
| … | *TBD* | | | | | Levels 21–99 |
| **100** | **Tsim Sha Tsui** | **尖沙嘴** | **十一煙花後** (post-fireworks) | **10** | **23** | Hardest: max density, pressure 1.6 surge, angry + luggage heavy; balanced for ~99 pts incl. one ultimate |

\* Narrative flavour only; keep content respectful and non-political in shipped copy.

## Implementation mapping (code)

`src/game/levels.ts` encodes levels 1–20 and 100 with density/timer/mix/pressure. Spawn tables are data-driven for all of them. Levels 21–99 remain TBD.

## Remaining work

- Author levels 21–99 (line themes: Island, Tsuen Wan, Kwun Tong, Tuen Ma…).
- Special “event” modifiers: Black Rain, first day of school, discount day at Harbour City.
- Boss-style modifiers for 25 / 50 / 75 / 100.
