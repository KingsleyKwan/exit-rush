# Levels — stations & difficulty (v0.7.0)

Difficulty is a composite of **density** (0–10), **pressure** (boarding), **special mix** and **timer seconds**. Exits stay **~10–20 s**, on a **complexity staircase**:

- **L1–5:** normals only.
- **L6–26:** one special introduced every three levels (★ = intro card before the timer).
- **L24–30:** mixes.
- **L31–99 (v0.7):** themed two- and three-type mixes by real-line stretch, with rising density and pressure.
- **Boss levels:** every 10th level from 20 to 90 ([`BOSSES.md`](BOSSES.md)).
- **L99:** the final exam.
- **L100:** finale.

Station names are **parody display names** (香城鐵路 fiction). The real→parody mapping, including Kingsley's v0.7 Chinese renames, is in [`STATIONS.md`](STATIONS.md).

**Level 100 頓沙嘴 · 十一煙花後** unlocks after clearing **level 99** (`FINALE_UNLOCK_AFTER`). A save that already cleared L100 keeps it open.

## Boss levels replace the exams (v0.7)

The v0.6 *exam* levels at 20/30 and the planned 40–90 exams are now **boss levels**. Station names are kept. Each one has a single oversized king of one special type, an entrance cutscene (2.6 s first time, 1.1 s after, tap to skip) and a slightly longer timer. **L99 Ocean Garden 海洋花園** is the only remaining *大考 exam* (all types). **L100** has all eight kings. Details, counters and balance: [`BOSSES.md`](BOSSES.md).

| Lv | King | Counter |
|---:|------|---------|
| 20 | 行李箱大王 Suitcase King | Hurdle · Ground Pound |
| 30 | 臭狐王 Stink Fox King | Hold Breath |
| 40 | 踎低王 Squat King | Leap · Charged Shove |
| 50 | 大家長 The Patriarch | Unbothered · Leap |
| 60 | 衰仔王 Brat King | Second Wind |
| 70 | 黏身情侶王 Clingy Couple Royals | Thread · Split |
| 80 | 嬲嬲豬王 Grumpy Hog King | Stand Firm |
| 90 | 大聲公王 Loudmouth King | Unbothered |

## All levels

Mix weights are relative to `normal 10`. "Doors open" is only listed where it differs from the default for that range (see below).

| Lv | Station EN | 站名 | Sec | Dens | Press | Specials (weight) | Role |
|----|------------|------|----:|-----:|------:|-------------------|------|
| 1 | Sheung Yuen | 上圓 | 14 | 6 | 0.08 | normals | Mid-morning quiet |
| 2 | Bastion Hill | 堡壘山 | 13 | 6 | 0.1 | normals | Lunch trickle |
| 3 | Gu Ching | 古城 | 13 | 6 | 0.15 | normals | After-school |
| 4 | Koi Stream | 鯉魚涌 | 12 | 7 | 0.2 | normals | Office spill |
| 5 | North Spot | 北點 | 12 | 7 | 0.25 | normals | Evening peak start |
| 6 ★ | Causeway Bay Village | 銅鑼灣村 | 14 | 6 | 0.29 | luggage 4 | **Intro luggage** · Weekend shoppers |
| 7 | Tin Wong | 天王 | 15 | 6 | 0.38 | luggage 5 | tip luggage · Temple fair spill |
| 8 ★ | Wan Neoi | 灣女 | 18 | 6 | 0.35 | squat 4 | **Intro squat** · Platform squatters |
| 9 ★ | Silver Bell | 銀鐘 | 18 | 6 | 0.38 | stench 4 | **Intro stench** · Cross-platform crush |
| 10 | Central Yuen | 中圓 | 18 | 7 | 0.35 | stench 5 | tip stench · Fri 18:30 |
| 11 | Hong City | 香城 | 22 | 7 | 0.35 | stench 3, luggage 3 | tip stench · Airport transfer vibe |
| 12 ★ | Nine-Head Dragon | 九頭龍 | 14 | 6 | 0.51 | family 5 | **Intro family** · Tourist wave |
| 13 | Aa Wan | 亞運 | 13 | 7 | 0.44 | family 5 | tip family · Concert let-out |
| 14 | Mong Gok | 望角 | 15 | 8 | 0.43 | family 4, luggage 3 | tip family · Sat night |
| 15 ★ | Gong Jyu | 公主 | 14 | 7 | 0.79 | brat 5 | **Intro brat** · Calm then surge |
| 16 | Yam Chow | 欽洲 | 14 | 7 | 0.43 | brat 5 | tip brat · Market close |
| 17 | Lai Chi Gok | 荔枝角 | 17 | 7 | 0.41 | brat 4, stench 3 | tip brat · Typhoon signal eve |
| 18 ★ | Chuen Jik | 荃直 | 17 | 7 | 0.49 | couple 5 | **Intro couple** · Terminal dump |
| 19 | Hung Kwun | 紅館 | 17 | 8 | 0.51 | couple 5 | tip couple · Through-train fantasy |
| 20 | **Dun East** | 頓東 | 20 | 8 | 0.47 | couple 3, family 2, luggage 1 | 👑 **Boss: Suitcase King 行李箱大王** · tip luggage |
| 21 ★ | Yuen Kwok | 元國 | 17 | 7 | 0.48 | angry 5 | **Intro angry** · New Territories rush |
| 22 | Long Ping Flat | 塱平 | 17 | 8 | 0.44 | angry 5 | tip angry · Estate evening |
| 23 | Sheung Yuen | 上圓 | 23 | 7 | 0.48 | angry 4, luggage 3 | tip angry · Late return |
| 24 | Bastion Hill | 堡壘山 | 23 | 7 | 0.37 | luggage 2, squat 2, stench 2, family 2 | tip squat · Mix exam A |
| 25 | Gu Ching | 古城 | 16 | 9 | 0.65 | brat 4, couple 4 | Mix exam B |
| 26 ★ | Koi Stream | 鯉魚涌 | 19 | 8 | 0.58 | loud 1 | **Intro loud** · Phone-call carriage |
| 27 | North Spot | 北點 | 24 | 8 | 0.54 | luggage 2, squat 2, stench 2, family 2, brat 2, couple 2, angry 2, loud 1 | tip loud · Boarding wall |
| 28 | Causeway Bay Village | 銅鑼灣村 | 24 | 7 | 0.35 | luggage 3 | tip luggage · Suitcase maze |
| 29 | Tin Wong | 天王 | 23 | 10 | 0.91 | angry 4, family 3, stench 3, loud 0.8 | Pressure spike |
| 30 | **Wan Neoi** | 灣女 | 28 | 10 | 0.39 | luggage 2, squat 2, stench 2, family 2, brat 2, couple 2, angry 2, loud 0.8 | 👑 **Boss: Stink Fox King 臭狐王** |
| 31 | East Ying Pun | 東營盤 | 21 | 9 | 0.63 | luggage 2, brat 2 | School run |
| 32 | Hong City University | 香城大學 | 18 | 9 | 0.73 | couple 3, loud 1 | tip couple · Campus couples |
| 33 | Down-to-Earth Town | 堅貼地城 | 15 | 8 | 0.98 | family 3, squat 2, luggage 1.5 | 2 doors open · Weekend outing |
| 34 | East Wan Ho | 東灣河 | 19 | 9 | 0.76 | stench 3, angry 2 | Gym let-out |
| 35 | Bamboo Kei Wan | 竹箕灣 | 22 | 9 | 0.53 | luggage 1.5, squat 1, brat 1 | Market haul |
| 36 | Shepherd Boy Chuen | 牧童邨 | 18 | 9 | 0.8 | brat 3, family 2, luggage 1.5 | Kids' day out |
| 37 | Chai Kong | 柴港 | 17 | 9 | 0.61 | angry 3, loud 1.2 | tip angry · Shift change |
| 38 | Yau Ma Sky | 油麻天 | 19 | 9 | 0.68 | stench 2, couple 2, loud 1 | Night market |
| 39 | Michael | 米高 | 20 | 9 | 0.67 | brat 2, angry 2, luggage 2 | Basketball fans |
| 40 | **Short Sand Bay** | 短沙灣 | 28 | 9 | 0.35 | squat 2, stench 1, luggage 1, brat 1, loud 0.5 | 👑 **Boss: Squat King 踎低王** |
| 41 | Lai Ching | 荔晴 | 24 | 9 | 0.52 | luggage 2, loud 1 | Interchange rush |
| 42 | Kwai Kwong | 葵廣 | 17 | 9 | 0.74 | family 3, couple 2 | Mall closing |
| 43 | Kwai Wong | 葵旺 | 17 | 8 | 0.62 | squat 3, stench 2, luggage 1.5 | 2 doors open · Lunch queue |
| 44 | Big Wok Mouth | 大鍋口 | 15 | 9 | 0.72 | angry 3, brat 2 | Hot pot night |
| 45 | Tsuen Wan East | 荃灣東 | 23 | 9 | 0.63 | luggage 2, family 2, loud 0.8 | Holiday departures |
| 46 | Shek Kip Head | 石硤頭 | 23 | 9 | 0.67 | stench 3, squat 2, brat 1 | Old estate |
| 47 | Kowloon University | 九龍大學 | 17 | 9 | 0.74 | couple 3, loud 1.2 | tip loud · Uni open day |
| 48 | Tiger | 老虎 | 17 | 9 | 0.8 | angry 3, family 2 | Temple fair |
| 49 | Blue Tai Sin | 藍大仙 | 19 | 9 | 0.81 | family 3, loud 1, stench 2 | Lunar new year |
| 50 | **Gem Hill** | 寶石山 | 20 | 9 | 0.73 | family 2, couple 1.5, squat 1, angry 1 | 👑 **Boss: The Patriarch 大家長** |
| 51 | Choi Wan | 彩雲 | 17 | 9 | 0.61 | brat 3, couple 2, luggage 1.5 | Rainbow parade |
| 52 | Nine Phoenix Bay | 九鳳灣 | 22 | 9 | 0.74 | luggage 2, angry 2, loud 1 | Office towers |
| 53 | Ox Tail Point | 牛尾角 | 16 | 8 | 0.93 | squat 3, family 2, luggage 1.5 | 2 doors open · Factory outlet |
| 54 | Kwun Hall | 觀堂 | 19 | 9 | 0.75 | angry 3, stench 2, loud 1 | Rush-hour core |
| 55 | Green Field | 綠田 | 19 | 9 | 0.78 | family 2, brat 2, luggage 2 | Estate school run |
| 56 | Oil Soup | 油湯 | 18 | 9 | 0.76 | stench 4, loud 1 | tip stench · Seafood street |
| 57 | Tiu Keng Peak | 調景峰 | 21 | 9 | 0.68 | couple 3, squat 2 | Hillside commute |
| 58 | Tseung Bing O | 將兵澳 | 24 | 9 | 0.92 | luggage 2, brat 2, loud 1 | New town |
| 59 | Hang Mei | 坑尾 | 20 | 9 | 0.75 | angry 3, squat 2 | Construction crews |
| 60 | **Po Chi Lam** | 寶之林 | 18 | 9 | 0.98 | brat 2, angry 1.5, squat 1.5, family 1, loud 0.6 | 👑 **Boss: Brat King 衰仔王** |
| 61 | Hong Town | 康鎮 | 15 | 10 | 0.89 | family 3, couple 2, loud 1 | Seaside flats |
| 62 | Blue Po | 藍埔 | 21 | 10 | 0.74 | luggage 2, stench 2 | Cruise day |
| 63 | Ho Mo Tin | 何武田 | 18 | 10 | 0.98 | brat 3, angry 2, luggage 1.5 | Prep schools |
| 64 | Papaya Bay | 木瓜灣 | 15 | 9 | 0.98 | squat 3, family 2, loud 1, luggage 1.5 | 2 doors open · Old district |
| 65 | Chun Wong Terrace | 秦王臺 | 15 | 10 | 0.82 | couple 3, stench 2 | History walk |
| 66 | Old Airport | 舊機場 | 19 | 10 | 0.7 | luggage 2, angry 2 | tip luggage · Stadium event |
| 67 | Hin Lou | 顯路 | 22 | 10 | 0.82 | stench 2, squat 2, loud 1.2 | Tunnel traffic |
| 68 | Che Po Temple | 車婆廟 | 16 | 10 | 0.84 | family 3, angry 2, brat 1, luggage 1.5 | Temple crowds |
| 69 | Sha Tin Ring | 沙田圈 | 24 | 10 | 0.77 | couple 2, squat 2, luggage 2 | Riverside |
| 70 | **City Two** | 第二城 | 21 | 9 | 0.8 | couple 2, luggage 1.5, stench 1, brat 1 | 👑 **Boss: Clingy Couple Royals 黏身情侶王** |
| 71 | Iron Gate | 鐵門 | 20 | 10 | 0.84 | angry 3, luggage 2 | Industrial belt |
| 72 | Big Fire Pit | 大火坑 | 18 | 10 | 0.84 | stench 3, brat 2, loud 1, luggage 1.5 | Barbecue weekend |
| 73 | Heng Lok | 恒樂 | 23 | 10 | 0.95 | family 2, squat 2, luggage 2, angry 2 | Quiet estate |
| 74 | Ma On Sea | 馬鞍海 | 15 | 10 | 0.88 | couple 2, angry 2, loud 1.2 | Mountain hikers |
| 75 | Wu Kai Rock | 烏溪石 | 18 | 10 | 0.92 | luggage 2, brat 2 | End of the line |
| 76 | Bak Cheong | 北昌 | 16 | 10 | 0.86 | stench 2, family 2, angry 2 | Interchange crush |
| 77 | Tung Si Din | 痌屎癲 | 22 | 10 | 0.86 | squat 3, couple 2, loud 1.2 | tip squat · Harbourside |
| 78 | Kam Ha Road | 錦下路 | 20 | 10 | 0.87 | luggage 2, angry 2, stench 1 | Country park |
| 79 | Dei Shui Wai | 地水圍 | 15 | 10 | 0.91 | family 3, brat 3, luggage 1.5 | Wetland trip |
| 80 | **Siu Gin** | 兆健 | 17 | 9 | 0.98 | angry 2, brat 1.5, squat 1, loud 0.8 | 👑 **Boss: Grumpy Hog King 嬲嬲豬王** |
| 81 | Tuen Bing | 屯兵 | 19 | 10 | 0.85 | angry 3, squat 2, loud 1 | Garrison town |
| 82 | Mong Kok West | 旺角西 | 18 | 10 | 0.85 | couple 3, luggage 2 | Shopping spree |
| 83 | Siu Wai | 小圍 | 17 | 10 | 0.91 | family 2, stench 2, brat 2, luggage 1.5 | Junction |
| 84 | Old City | 舊城市 | 20 | 10 | 0.89 | angry 3, luggage 2, loud 1.2 | Old city centre |
| 85 | Bing Tan | 冰炭 | 14 | 9 | 0.91 | squat 3, stench 2, luggage 1.5 | 2 doors open · Workshop lane |
| 86 | Ox Course | 牛場 | 17 | 10 | 0.78 | angry 4, couple 2, luggage 1.5 | tip angry · Race day |
| 87 | Secondary School | 中學 | 16 | 10 | 0.98 | brat 3, family 2, loud 1, luggage 1.5 | Exam season |
| 88 | Tai Po Mart | 大埔市 | 18 | 10 | 0.88 | luggage 2, family 2, stench 1 | Market town |
| 89 | Tai Ping | 太平 | 18 | 10 | 0.94 | couple 3, squat 2, loud 1 | Peaceful suburb |
| 90 | **Fan Hill** | 粉山 | 21 | 9 | 0.92 | loud 1.2, angry 1.5, stench 1.5, couple 1 | 👑 **Boss: Loudmouth King 大聲公王** |
| 91 | Ha Shui | 下水 | 19 | 10 | 0.98 | luggage 2, angry 2 | Border shoppers |
| 92 | Lo Hoi | 羅海 | 21 | 10 | 0.8 | luggage 2, squat 2, loud 1 | Border gate |
| 93 | Mount Horse Isle | 上馬洲 | 16 | 10 | 0.89 | family 3, angry 2, stench 1, luggage 1.5 | Last checkpoint |
| 94 | Tsing Saam | 青衫 | 15 | 10 | 0.9 | stench 3, couple 2, loud 1.2 | Bridge winds |
| 95 | Joyful Bay | 歡澳 | 16 | 10 | 0.92 | family 2, brat 2, luggage 2, angry 3 | Theme park day |
| 96 | West Chung | 西涌 | 16 | 10 | 0.85 | luggage 2, family 2, loud 1 | Airport town |
| 97 | Aeroplane | 飛機 | 16 | 10 | 0.67 | luggage 2, angry 2 | tip luggage · Departures |
| 98 | Expo City | 博覽城 | 16 | 10 | 0.95 | couple 2, brat 2, loud 1.5, stench 2, luggage 1.5 | Concert night |
| 99 | **Ocean Garden** | 海洋花園 | 17 | 10 | 0.8 | luggage 2, squat 2, stench 2, family 2, brat 2, couple 2, angry 3, loud 1.5 | **Final exam 大考** |
| 100 | **Dun Sha Mouth** | 頓沙嘴 | 30 | 8 | 0.9 | angry 7, luggage 4, squat 3, family 3, couple 2, stench 2, brat 1, loud 1 | 👑 **All eight kings 八王齊集** · fireworks |

## Difficulty bands (bot, earned build)

`npm run test:sim` checks each level's clear rate against its band. The build is the **earned build**: a balance fixture of branch power (one power point per earlier level, spread over that band's natural branch, counters once they're reachable). It is not the player's skill-point currency.

| Levels | Target clear |
|--------|--------------|
| 1–5 | ≥ 95 % |
| 6–15 | 75–90 % |
| 16–30 | 55–75 % |
| 31–60 | 50–70 % |
| 61–99 | 35–60 % |
| 100 | ultimate builds 30–50 % · 20-point build 0–5 % |

Numbers and method: [`BALANCE.md`](BALANCE.md).

## Skill points (v0.8.1)

Every **10** first clears award **1** skill point; replays award **0**. One point learns one skill, and the branch power jumps to the next node (10 / 20 / 30 / 40 / 50 / 60). The ultimate is one more point after the branch is full. 100 levels = **10** points: one full branch (6) + ultimate (1) + 3 more skills. A focused branch still reaches power 40 after 40 first clears and the ultimate after 70. Spare points are re-derived on load. A build that bought more skills than it earns is refunded once, with the 「技能點已重新計算」 notice. Free respec and three loadouts (配點1/2/3) are described in [`SKILL_TREE.md`](SKILL_TREE.md).

## Teach order

| Level | Intro |
|------:|-------|
| 6 | luggage |
| 8 | squat / 踎低 |
| 9 | stench |
| 12 | family |
| 15 | brat |
| 18 | couple |
| 21 | angry |
| 26 | loudmouth / 大聲公 |

Tips reinforce types later on (the `tip` entries in the table). Loudmouths are always riders (already on board, mid-call), never boarders, so a noise zone never parks on the exit itself.

## Open door bays

Side-door bays sit on the left (−X) wall at Z −2.6 / 0 / 2.6:

| Levels | Open bays | Notes |
|--------|-----------|-------|
| 1–7 | 3 | All open |
| 8–15 | 2 | Mid + near (Z 0, 2.6); far bay stays shut |
| 16–100 | 1 | Mid only (Z 0) |
| 33, 43, 53, 64, 85 | 2 | v0.7 relief levels (`openDoors: 2`): mid + near, at higher pressure |

Closed bays keep their leaves shut, show a red indicator and a 「此門不開」 sign, and toast if the player pushes them.
