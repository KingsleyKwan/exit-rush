# Levels draft — stations & difficulty

Difficulty is a composite of **density** (0–10), **pressure** (boarding spawn), **special mix**, and **timer seconds**. Curve is approximate for design; code uses these numbers for levels **1–5** fully, and exposes stubs for the rest.

**Level 100** is fixed as the hardest fantasy beat: **Tsim Sha Tsui after fireworks (十一煙花後尖沙嘴)**.

Levels **21–99** are **TBD** (repeat motifs with escalating modifiers, branch lines, typhoon days, etc.).

| Lv | Station EN | 站名 | Time / flavour | Density | Timer (s) | Notes |
|----|------------|------|----------------|---------|-----------|-------|
| 1 | Sheung Wan | 上環 | Mid-morning quiet | 2 | 60 | Tutorial density; mostly normals |
| 2 | Fortress Hill | 炮台山 | Lunch trickle | 3 | 55 | + luggage |
| 3 | Tai Koo | 太古 | After-school | 4 | 50 | +brat |
| 4 | Quarry Bay | 鰂魚涌 | Office spill | 5 | 48 | +angry |
| 5 | North Point | 北角 | Evening peak start | 6 | 45 | Mix + family |
| 6 | Causeway Bay | 銅鑼灣 | Weekend shoppers | 6 | 44 | Luggage heavy |
| 7 | Tin Hau | 天后 | Temple fair spill | 5 | 46 | Stench + family |
| 8 | Wan Chai | 灣仔 | Conference let-out | 7 | 42 | Couples + angry |
| 9 | Admiration | 金鐘 | Cross-platform crush | 7 | 40 | High pressure |
| 10 | Central | 中環 | Fri 18:30 | 8 | 38 | Classic peak |
| 11 | Hong Kong | 香港 | Airport Express transfer vibe | 6 | 40 | Luggage max |
| 12 | Kowloon | 九龍 | Tourist wave | 7 | 39 | Couples + luggage |
| 13 | Olympic | 奧運 | Concert let-out | 8 | 36 | Angry spike |
| 14 | Mong Kok | 旺角 | Sat night | 9 | 34 | All types |
| 15 | Prince Edward | 太子 | Protest-era memory calm→surge* | 8 | 35 | *fictionalised surge only |
| 16 | Sham Shui Po | 深水埗 | Market close | 7 | 37 | Stench + family |
| 17 | Mei Foo | 美孚 | Typhoon signal eve | 8 | 33 | Pressure up |
| 18 | Tsuen Wan | 荃灣 | Terminal dump | 8 | 32 | Boarding wall |
| 19 | Hung Hom | 紅磡 | Through-train fantasy | 9 | 30 | Luggage + angry |
| 20 | East Tsim Sha Tsui | 尖東 | Pre-fireworks | 9 | 28 | Dress rehearsal for 100 |
| … | *TBD* | | | | | Levels 21–99 |
| **100** | **Tsim Sha Tsui** | **尖沙嘴** | **十一煙花後** (post-fireworks) | **10** | **22** | Hardest: max density, hostile mix, inbound tsunami |

\* Narrative flavour only; keep content respectful and non-political in shipped copy.

## Implementation mapping (code)

`src/game/levels.ts` encodes levels 1–20 and 100 with density/timer/mix/pressure. Spawn tables are data-driven for all of them. Levels 21–99 remain TBD.

## Remaining work

- Author levels 21–99 (line themes: Island, Tsuen Wan, Kwun Tong, Tuen Ma…).
- Special “event” modifiers: Black Rain, first day of school, discount day at Harbour City.
- Boss-style modifiers for 25 / 50 / 75 / 100.
