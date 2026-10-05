# Station & line parody map (香城鐵路 / Hong City Rail)

Player-facing names are **fiction**. Real-world names appear here and in `src/game/stations.ts` as **dev-only** `realEn` / `realZh` fields so wall colours / fonts can still follow the station being parodied. They are never shown in UI, signs, or store text.

Operator: **香城鐵路** · **Hong City Rail** (HCR) — a parody inspired by the Hong Kong metro, **not affiliated** with MTR Corporation or any real railway.

## Stations in playable levels

| Level | Real (dev) | Parody 中 | Parody EN | Note |
|------:|------------|-----------|-----------|------|
| 1 | 上環 Sheung Wan | 上圓 | Sheung Yuen | 環→圓 |
| 2 | 炮台山 Fortress Hill | 堡壘山 | Bastion Hill | 炮台→堡壘 |
| 3 | 太古 Tai Koo | 古城 | Gu Ching | 太古→古城 |
| 4 | 鰂魚涌 Quarry Bay | 鯉魚涌 | Koi Stream | 鰂→鯉 |
| 5 | 北角 North Point | 北點 | North Spot | 角→點 |
| 6 | 銅鑼灣 Causeway Bay | 銅鑼灣村 | Causeway Bay Village | owner: +村 |
| 7 | 天后 Tin Hau | 天王 | Tin Wong | 后→王 |
| 8 | 灣仔 Wan Chai | 灣女 | Wan Neoi | 仔→女 |
| 9 | 金鐘 Admiralty | 銀鐘 | Silver Bell | 金→銀 |
| 10 | 中環 Central | 中圓 | Central Yuen | 環→圓 |
| 11 | 香港 Hong Kong | 香城 | Hong City | ties to HCR |
| 12 | 九龍 Kowloon | 九頭龍 | Nine-Head Dragon | 龍→九頭龍 |
| 13 | 奧運 Olympic | 亞運 | Aa Wan | 奧→亞 |
| 14 | 旺角 Mong Kok | 望角 | Mong Gok | owner: 旺→望 |
| 15 | 太子 Prince Edward | 公主 | Gong Jyu | 太子→公主 |
| 16 | 深水埗 Sham Shui Po | 欽洲 | Yam Chow | 深水埗→欽洲 |
| 17 | 美孚 Mei Foo | 荔枝角 | Lai Chi Gok | 美孚→荔枝角 |
| 18 | 荃灣 Tsuen Wan | 荃直 | Chuen Jik | 灣→直 |
| 19 | 紅磡 Hung Hom | 萬國 | Maan Gwok | 紅磡→萬國 |
| 20 | 尖東 East Tsim Sha Tsui | 頓東 | Dun East | 尖→頓 |
| 100 | 尖沙咀 Tsim Sha Tsui | 頓沙嘴 | Dun Sha Mouth | 尖→頓 · 咀→嘴 |

## Extra (owner examples, not yet in levels)

| Real | Parody 中 | Parody EN |
|------|-----------|-----------|
| 元朗 Yuen Long | 元國 | Yuen Kwok |
| 朗屏 Long Ping | 塱平 | Long Ping Flat |

## Lines (parody)

| Real line (dev) | Parody 中 | Parody EN | `LineId` |
|-----------------|-----------|-----------|----------|
| Island Line 港島綫 | 香島綫 | Heung Island Line | `isl` |
| Tsuen Wan Line 荃灣綫 | 荃直綫 | Chuen Jik Line | `twl` |
| Kwun Tong Line 觀塘綫 | 觀濱綫 | Kun Tong Line | `ktl` |
| Tung Chung Line 東涌綫 | 東沖綫 | Tung Chong Line | `tcl` |
| Airport Express | 香城空港綫 | HCR Airport Line | `ael` |
| East Rail 東鐵綫 | 東軌綫 | East Track Line | `eal` |
| Tuen Ma Line 屯馬綫 | 屯碼綫 | Tuen Ma Code Line | `tml` |
| South Island Line 南港島綫 | 南香島綫 | South Heung Island | `sil` |
| Tseung Kwan O Line 將軍澳綫 | 將軍綫 | General Bay Line | `tkl` |

## Announcements (JR style)

See `docs/GAME_DESIGN.md` § Audio. Scripts use parody names, e.g.:

- JA: 「まもなく、公主です。お出口は左側です。」
- EN: “The next station is Gong Jyu. The doors on the left side will open.”
- ZH (粵): 「下一站，公主。請往左邊車門落車。」

Shipped as an **original** short 発車メロディ-like jingle (Web Audio; not a real JR melody) + on-screen bilingual flash. Offline Japanese TTS deferred — see TODO in GAME_DESIGN.
