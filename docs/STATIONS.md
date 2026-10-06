# Station & line parody map (香城鐵路 / Hong City Rail)

> **Kingsley：** 呢度列晒第 1–100 關嘅站名。第 31–99 關係暫定名（標咗「暫定」），隨便改。改完話我知，我會跟你嘅名補完關卡。

Player-facing names are **fiction**. Real-world names appear here and in `src/game/stations.ts` as **dev-only** `realEn` / `realZh` fields so wall colours / fonts can still follow the station being parodied. They are never shown in UI, signs, or store text.

Operator: **香城鐵路** · **Hong City Rail** (HCR) — a parody inspired by the Hong Kong metro, **not affiliated** with the real-world operator or any real railway.

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
| 21 | 元朗 Yuen Long | 元國 | Yuen Kwok | 朗→國 |
| 22 | 朗屏 Long Ping | 塱平 | Long Ping Flat | owner: 塱平 |

Levels **23–30** reuse earlier parody stations with new flavour text (same display names).

## Levels 23–30 (in game now — reuse earlier stations)

| Level | Parody 中 | Parody EN | Same as |
|------:|-----------|-----------|---------|
| 23 | 上圓 | Sheung Yuen | L1 |
| 24 | 堡壘山 | Bastion Hill | L2 |
| 25 | 古城 | Gu Ching | L3 |
| 26 | 鯉魚涌 | Koi Stream | L4 |
| 27 | 北點 | North Spot | L5 |
| 28 | 銅鑼灣村 | Causeway Bay Village | L6 |
| 29 | 天王 | Tin Wong | L7 |
| 30 | 灣女 | Wan Neoi | L8 |

## Levels 31–99 (暫定 provisional — not in the game yet)

Provisional names for future levels, same pattern as above: a real station (any line) with **one character** punned. Owner edits these; nothing here is wired into `src/game/levels.ts` / `stations.ts` yet. L100 is above (頓沙嘴).

| Level | Real (dev) | Parody 中 | Parody EN | Note | 暫定 |
|------:|------------|-----------|-----------|------|:----:|
| 31 | 西營盤 Sai Ying Pun | 西贏盤 | Sai Win Pun | 營→贏 | 暫定 |
| 32 | 香港大學 HKU | 香城大學 | Hong City University | 港→城 | 暫定 |
| 33 | 堅尼地城 Kennedy Town | 堅尼地港 | Kennedy Harbour | 城→港 | 暫定 |
| 34 | 西灣河 Sai Wan Ho | 東灣河 | East Wan Ho | 西→東 | 暫定 |
| 35 | 筲箕灣 Shau Kei Wan | 筲箕彎 | Shau Kei Bend | 灣→彎 | 暫定 |
| 36 | 杏花邨 Heng Fa Chuen | 李花邨 | Plum Blossom Chuen | 杏→李 | 暫定 |
| 37 | 柴灣 Chai Wan | 柴港 | Chai Kong | 灣→港 | 暫定 |
| 38 | 油麻地 Yau Ma Tei | 油麻天 | Yau Ma Sky | 地→天 | 暫定 |
| 39 | 佐敦 Jordan | 佐登 | Jor Dang | 敦→登 | 暫定 |
| 40 | 長沙灣 Cheung Sha Wan | 短沙灣 | Short Sand Bay | 長→短 | 暫定 |
| 41 | 荔景 Lai King | 荔晴 | Lai Ching | 景→晴 | 暫定 |
| 42 | 葵芳 Kwai Fong | 葵香 | Kwai Heung | 芳→香 | 暫定 |
| 43 | 葵興 Kwai Hing | 葵旺 | Kwai Wong | 興→旺 | 暫定 |
| 44 | 大窩口 Tai Wo Hau | 大鍋口 | Big Wok Mouth | 窩→鍋 | 暫定 |
| 45 | 荃灣西 Tsuen Wan West | 荃灣溪 | Tsuen Wan Creek | 西→溪 | 暫定 |
| 46 | 石硤尾 Shek Kip Mei | 石硤頭 | Shek Kip Head | 尾→頭 | 暫定 |
| 47 | 九龍塘 Kowloon Tong | 九龍糖 | Kowloon Candy | 塘→糖 | 暫定 |
| 48 | 樂富 Lok Fu | 樂貴 | Lok Gwai | 富→貴 | 暫定 |
| 49 | 黃大仙 Wong Tai Sin | 黃小仙 | Wong Little Sin | 大→小 | 暫定 |
| 50 | 鑽石山 Diamond Hill | 寶石山 | Gem Hill | 鑽→寶 | 暫定 |
| 51 | 彩虹 Choi Hung | 彩雲 | Choi Wan | 虹→雲 | 暫定 |
| 52 | 九龍灣 Kowloon Bay | 九鳳灣 | Nine Phoenix Bay | 龍→鳳 | 暫定 |
| 53 | 牛頭角 Ngau Tau Kok | 牛尾角 | Ox Tail Point | 頭→尾 | 暫定 |
| 54 | 觀塘 Kwun Tong | 觀堂 | Kwun Hall | 塘→堂 | 暫定 |
| 55 | 藍田 Lam Tin | 綠田 | Green Field | 藍→綠 | 暫定 |
| 56 | 油塘 Yau Tong | 油湯 | Oil Soup | 塘→湯 | 暫定 |
| 57 | 調景嶺 Tiu Keng Leng | 調景峰 | Tiu Keng Peak | 嶺→峰 | 暫定 |
| 58 | 將軍澳 Tseung Kwan O | 將兵澳 | Tseung Bing O | 軍→兵 | 暫定 |
| 59 | 坑口 Hang Hau | 坑尾 | Hang Mei | 口→尾 | 暫定 |
| 60 | 寶琳 Po Lam | 寶林 | Po Forest | 琳→林 | 暫定 |
| 61 | 康城 LOHAS Park | 康鎮 | Hong Town | 城→鎮 | 暫定 |
| 62 | 黃埔 Whampoa | 紅埔 | Hung Po | 黃→紅 | 暫定 |
| 63 | 何文田 Ho Man Tin | 何武田 | Ho Mo Tin | 文→武 | 暫定 |
| 64 | 土瓜灣 To Kwa Wan | 木瓜灣 | Papaya Bay | 土→木 | 暫定 |
| 65 | 宋皇臺 Sung Wong Toi | 宋王臺 | Sung King Terrace | 皇→王 | 暫定 |
| 66 | 啟德 Kai Tak | 啟得 | Kai Dak | 德→得 | 暫定 |
| 67 | 顯徑 Hin Keng | 顯路 | Hin Lou | 徑→路 | 暫定 |
| 68 | 車公廟 Che Kung Temple | 車婆廟 | Che Po Temple | 公→婆 | 暫定 |
| 69 | 沙田圍 Sha Tin Wai | 沙田圈 | Sha Tin Ring | 圍→圈 | 暫定 |
| 70 | 第一城 City One | 第二城 | City Two | 一→二 | 暫定 |
| 71 | 石門 Shek Mun | 鐵門 | Iron Gate | 石→鐵 | 暫定 |
| 72 | 大水坑 Tai Shui Hang | 大火坑 | Big Fire Pit | 水→火 | 暫定 |
| 73 | 恒安 Heng On | 恒樂 | Heng Lok | 安→樂 | 暫定 |
| 74 | 馬鞍山 Ma On Shan | 馬鞍海 | Ma On Sea | 山→海 | 暫定 |
| 75 | 烏溪沙 Wu Kai Sha | 烏溪石 | Wu Kai Rock | 沙→石 | 暫定 |
| 76 | 南昌 Nam Cheong | 北昌 | Bak Cheong | 南→北 | 暫定 |
| 77 | 柯士甸 Austin | 柯士丁 | Or See Ting | 甸→丁 | 暫定 |
| 78 | 錦上路 Kam Sheung Road | 錦下路 | Kam Ha Road | 上→下 | 暫定 |
| 79 | 天水圍 Tin Shui Wai | 地水圍 | Dei Shui Wai | 天→地 | 暫定 |
| 80 | 兆康 Siu Hong | 兆健 | Siu Gin | 康→健 | 暫定 |
| 81 | 屯門 Tuen Mun | 屯窗 | Tuen Window | 門→窗 | 暫定 |
| 82 | 旺角東 Mong Kok East | 旺角冬 | Mong Kok Winter | 東→冬 | 暫定 |
| 83 | 大圍 Tai Wai | 小圍 | Siu Wai | 大→小 | 暫定 |
| 84 | 沙田 Sha Tin | 沙甜 | Sweet Sand | 田→甜 | 暫定 |
| 85 | 火炭 Fo Tan | 冰炭 | Bing Tan | 火→冰 | 暫定 |
| 86 | 馬場 Racecourse | 牛場 | Ox Course | 馬→牛 | 暫定 |
| 87 | 大學 University | 中學 | Secondary School | 大→中 | 暫定 |
| 88 | 大埔墟 Tai Po Market | 大埔市 | Tai Po Mart | 墟→市 | 暫定 |
| 89 | 太和 Tai Wo | 太平 | Tai Ping | 和→平 | 暫定 |
| 90 | 粉嶺 Fanling | 粉山 | Fan Hill | 嶺→山 | 暫定 |
| 91 | 上水 Sheung Shui | 下水 | Ha Shui | 上→下 | 暫定 |
| 92 | 羅湖 Lo Wu | 羅海 | Lo Hoi | 湖→海 | 暫定 |
| 93 | 落馬洲 Lok Ma Chau | 上馬洲 | Mount Horse Isle | 落→上 | 暫定 |
| 94 | 青衣 Tsing Yi | 青衫 | Tsing Saam | 衣→衫 | 暫定 |
| 95 | 欣澳 Sunny Bay | 歡澳 | Joyful Bay | 欣→歡 | 暫定 |
| 96 | 東涌 Tung Chung | 西涌 | West Chung | 東→西 | 暫定 |
| 97 | 機場 Airport | 飛場 | Fei Cheung Field | 機→飛 | 暫定 |
| 98 | 博覽館 AsiaWorld-Expo | 博覽城 | Expo City | 館→城 | 暫定 |
| 99 | 海洋公園 Ocean Park | 海洋花園 | Ocean Garden | 公→花 | 暫定 |

## Extra (reserved for future levels)

| Real | Parody 中 | Parody EN |
|------|-----------|-----------|
| *(none currently)* | | |

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
