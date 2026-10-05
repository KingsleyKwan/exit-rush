# Station & line parody map (香城鐵路 / Hong City Rail)

Player-facing names are **fiction**. Real-world names appear here and in `src/game/stations.ts` as **dev-only** `realEn` / `realZh` fields so wall colours / fonts can still follow the station being parodied. They are never shown in UI, signs, or store text.

Operator: **香城鐵路** · **Hong City Rail** (HCR) — a parody inspired by the Hong Kong metro, **not affiliated** with MTR Corporation or any real railway.

## Stations in playable levels

| Level | Real (dev) | Parody 中 | Parody EN | Note |
|------:|------------|-----------|-----------|------|
| 1 | 上環 Sheung Wan | 上圜 | Sheung Huan | 環→圜 |
| 2 | 炮台山 Fortress Hill | 炮台崗 | Fortress Knoll | 山→崗 |
| 3 | 太古 Tai Koo | 太故 | Tai Gu | 古→故 |
| 4 | 鰂魚涌 Quarry Bay | 鯽魚涌 | Carp Stream | 鰂→鯽 |
| 5 | 北角 North Point | 北覺 | North Gok | 角→覺 |
| 6 | 銅鑼灣 Causeway Bay | 銅鑼灣村 | Causeway Bay Village | owner: +村 |
| 7 | 天后 Tin Hau | 天後 | Tin Hau After | 后→後 |
| 8 | 灣仔 Wan Chai | 灣崽 | Wan Jai | 仔→崽 |
| 9 | 金鐘 Admiralty | 金鍾 | Gold Bell | 鐘→鍾 |
| 10 | 中環 Central | 中圜 | Central Ring | 環→圜 |
| 11 | 香港 Hong Kong | 香城 | Hong City | ties to HCR |
| 12 | 九龍 Kowloon | 九朧 | Nine Dragons | 龍→朧 |
| 13 | 奧運 Olympic | 澳運 | Ou Wan | 奧→澳 |
| 14 | 旺角 Mong Kok | 望角 | Mong Gok | owner: 旺→望 |
| 15 | 太子 Prince Edward | 太仔 | Tai Jai | owner |
| 16 | 深水埗 Sham Shui Po | 深水埔 | Sham Shui Pooh | 埗→埔 |
| 17 | 美孚 Mei Foo | 美浮 | Mei Foo Float | 孚→浮 |
| 18 | 荃灣 Tsuen Wan | 全灣 | Chuen Wan | 荃→全 |
| 19 | 紅磡 Hung Hom | 紅砍 | Hung Hom Chop | 磡→砍 |
| 20 | 尖東 East TST | 尖冬 | East Point Winter | 東→冬 |
| 100 | 尖沙咀 Tsim Sha Tsui | 尖沙嘴 | Tsim Sha Mouth | 咀→嘴 |

## Extra (owner examples, not yet in levels)

| Real | Parody 中 | Parody EN |
|------|-----------|-----------|
| 元朗 Yuen Long | 元國 | Yuen Kwok |
| 朗屏 Long Ping | 塱平 | Long Ping Flat |

## Lines (parody)

| Real line (dev) | Parody 中 | Parody EN | `LineId` |
|-----------------|-----------|-----------|----------|
| Island Line 港島綫 | 香島綫 | Heung Island Line | `isl` |
| Tsuen Wan Line 荃灣綫 | 全灣綫 | Chuen Wan Line | `twl` |
| Kwun Tong Line 觀塘綫 | 觀堂綫 | Kun Tong Line | `ktl` |
| Tung Chung Line 東涌綫 | 東衝綫 | Tung Chong Line | `tcl` |
| Airport Express | 香城空港綫 | HCR Airport Line | `ael` |
| East Rail 東鐵綫 | 東軌綫 | East Track Line | `eal` |
| Tuen Ma Line 屯馬綫 | 屯碼綫 | Tuen Ma Code Line | `tml` |
| South Island Line 南港島綫 | 南香島綫 | South Heung Island | `sil` |
| Tseung Kwan O Line 將軍澳綫 | 將官澳綫 | General Bay Line | `tkl` |

## Announcements (JR style)

See `docs/GAME_DESIGN.md` § Audio. Scripts use parody names, e.g.:

- JA: 「まもなく、太仔です。お出口は左側です。」
- EN: “The next station is Tai Jai. The doors on the left side will open.”
- ZH (粵): 「下一站，太仔。請往左邊車門落車。」

Shipped as an **original** short 発車メロディ-like jingle (Web Audio; not a real JR melody) + on-screen bilingual flash. Offline Japanese TTS deferred — see TODO in GAME_DESIGN.
