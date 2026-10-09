/**
 * Fictional 香城鐵路 (Hong City Rail / HCR) station catalogue.
 *
 * Display names are playful parodies of well-known Hong Kong metro stops.
 * `realEn` / `realZh` are DEV-ONLY references for theme colours & docs —
 * never shown in UI, signs, or store text.
 */
export interface StationDef {
  /** Stable id (kebab of the real English name). */
  id: string;
  /** DEV ONLY — real-world station being parodied. */
  realEn: string;
  /** DEV ONLY — real-world Chinese name. */
  realZh: string;
  /** Player-facing English (parody). */
  displayEn: string;
  /** Player-facing Chinese (parody). */
  displayZh: string;
  /** Spoken Japanese reading of the parody name. Kana only, never a real station name. */
  displayJa?: string;
}

/**
 * All stations used by levels.ts. Colours/fonts still follow `realEn`
 * via stationThemes.ts.
 */
export const STATIONS: StationDef[] = [
  { id: 'sheung-wan', realEn: 'Sheung Wan', realZh: '上環', displayEn: 'Sheung Yuen', displayZh: '上圓', displayJa: 'ションユエン' },
  { id: 'fortress-hill', realEn: 'Fortress Hill', realZh: '炮台山', displayEn: 'Bastion Hill', displayZh: '堡壘山', displayJa: 'とりでやま' },
  { id: 'tai-koo', realEn: 'Tai Koo', realZh: '太古', displayEn: 'Gu Ching', displayZh: '古城', displayJa: 'こじょう' },
  { id: 'quarry-bay', realEn: 'Quarry Bay', realZh: '鰂魚涌', displayEn: 'Koi Stream', displayZh: '鯉魚涌', displayJa: 'こいストリーム' },
  { id: 'north-point', realEn: 'North Point', realZh: '北角', displayEn: 'North Spot', displayZh: '北點', displayJa: 'ノーススポット' },
  // Owner-specified
  { id: 'causeway-bay', realEn: 'Causeway Bay', realZh: '銅鑼灣', displayEn: 'Causeway Bay Village', displayZh: '銅鑼灣村', displayJa: 'トングロワンソン' },
  { id: 'tin-hau', realEn: 'Tin Hau', realZh: '天后', displayEn: 'Tin Wong', displayZh: '天王', displayJa: 'ティンウォン' },
  { id: 'wan-chai', realEn: 'Wan Chai', realZh: '灣仔', displayEn: 'Wan Neoi', displayZh: '灣女', displayJa: 'ワンノイ' },
  { id: 'admiralty', realEn: 'Admiralty', realZh: '金鐘', displayEn: 'Silver Bell', displayZh: '銀鐘', displayJa: 'ぎんしょう' },
  { id: 'central', realEn: 'Central', realZh: '中環', displayEn: 'Central Yuen', displayZh: '中圓', displayJa: 'チュンユエン' },
  { id: 'hong-kong', realEn: 'Hong Kong', realZh: '香港', displayEn: 'Hong City', displayZh: '香城', displayJa: 'ホンシティ' },
  { id: 'kowloon', realEn: 'Kowloon', realZh: '九龍', displayEn: 'Nine-Head Dragon', displayZh: '九頭龍', displayJa: 'ナインヘッドドラゴン' },
  { id: 'olympic', realEn: 'Olympic', realZh: '奧運', displayEn: 'Aa Wan', displayZh: '亞運', displayJa: 'アーワン' },
  // Owner-specified
  { id: 'mong-kok', realEn: 'Mong Kok', realZh: '旺角', displayEn: 'Mong Gok', displayZh: '望角', displayJa: 'モンゴク' },
  // Owner-specified
  { id: 'prince-edward', realEn: 'Prince Edward', realZh: '太子', displayEn: 'Gong Jyu', displayZh: '公主', displayJa: 'コンジュ' },
  { id: 'sham-shui-po', realEn: 'Sham Shui Po', realZh: '深水埗', displayEn: 'Yam Chow', displayZh: '欽洲', displayJa: 'ヤムチャウ' },
  { id: 'mei-foo', realEn: 'Mei Foo', realZh: '美孚', displayEn: 'Lai Chi Gok', displayZh: '荔枝角', displayJa: 'ライチーゴク' },
  { id: 'tsuen-wan', realEn: 'Tsuen Wan', realZh: '荃灣', displayEn: 'Chuen Jik', displayZh: '荃直', displayJa: 'チュエンジック' },
  { id: 'hung-hom', realEn: 'Hung Hom', realZh: '紅磡', displayEn: 'Hung Kwun', displayZh: '紅館', displayJa: 'ホンクン' },
  { id: 'east-tst', realEn: 'East Tsim Sha Tsui', realZh: '尖東', displayEn: 'Dun East', displayZh: '頓東', displayJa: 'トン東' },
  { id: 'tst', realEn: 'Tsim Sha Tsui', realZh: '尖沙咀', displayEn: 'Dun Sha Mouth', displayZh: '頓沙嘴', displayJa: 'トンシャーツィ' },
  // v0.5 — New Territories parody stops (L21–22)
  { id: 'yuen-long', realEn: 'Yuen Long', realZh: '元朗', displayEn: 'Yuen Kwok', displayZh: '元國', displayJa: 'ユエンコク' },
  { id: 'long-ping', realEn: 'Long Ping', realZh: '朗屏', displayEn: 'Long Ping Flat', displayZh: '塱平', displayJa: 'ロンピン' },
  // v0.7 — L31–99 (owner-curated in docs/STATIONS.md; EN kept exactly as in the doc)
  { id: 'sai-ying-pun', realEn: 'Sai Ying Pun', realZh: '西營盤', displayEn: 'East Ying Pun', displayZh: '東營盤', displayJa: 'イーストイングプン' },
  { id: 'hku', realEn: 'HKU', realZh: '香港大學', displayEn: 'Hong City University', displayZh: '香城大學', displayJa: 'ホンシティユニバーシティ' },
  { id: 'kennedy-town', realEn: 'Kennedy Town', realZh: '堅尼地城', displayEn: 'Down-to-Earth Town', displayZh: '堅貼地城', displayJa: 'ダウントゥーアースタウン' },
  { id: 'sai-wan-ho', realEn: 'Sai Wan Ho', realZh: '西灣河', displayEn: 'East Wan Ho', displayZh: '東灣河', displayJa: 'イーストワンホー' },
  { id: 'shau-kei-wan', realEn: 'Shau Kei Wan', realZh: '筲箕灣', displayEn: 'Bamboo Kei Wan', displayZh: '竹箕灣', displayJa: 'バンブーケイワン' },
  { id: 'heng-fa-chuen', realEn: 'Heng Fa Chuen', realZh: '杏花邨', displayEn: 'Shepherd Boy Chuen', displayZh: '牧童邨', displayJa: 'シェパードボーイチュエン' },
  { id: 'chai-wan', realEn: 'Chai Wan', realZh: '柴灣', displayEn: 'Chai Kong', displayZh: '柴港', displayJa: 'チャイコン' },
  { id: 'yau-ma-tei', realEn: 'Yau Ma Tei', realZh: '油麻地', displayEn: 'Yau Ma Sky', displayZh: '油麻天', displayJa: 'ヤウマスカイ' },
  { id: 'jordan', realEn: 'Jordan', realZh: '佐敦', displayEn: 'Michael', displayZh: '米高', displayJa: 'マイケル' },
  { id: 'cheung-sha-wan', realEn: 'Cheung Sha Wan', realZh: '長沙灣', displayEn: 'Short Sand Bay', displayZh: '短沙灣', displayJa: 'ショートサンドベイ' },
  { id: 'lai-king', realEn: 'Lai King', realZh: '荔景', displayEn: 'Lai Ching', displayZh: '荔晴', displayJa: 'ライチン' },
  { id: 'kwai-fong', realEn: 'Kwai Fong', realZh: '葵芳', displayEn: 'Kwai Kwong', displayZh: '葵廣', displayJa: 'クワイクウォン' },
  { id: 'kwai-hing', realEn: 'Kwai Hing', realZh: '葵興', displayEn: 'Kwai Wong', displayZh: '葵旺', displayJa: 'クワイウォン' },
  { id: 'tai-wo-hau', realEn: 'Tai Wo Hau', realZh: '大窩口', displayEn: 'Big Wok Mouth', displayZh: '大鍋口', displayJa: 'ビッグウォクマウス' },
  { id: 'tsuen-wan-west', realEn: 'Tsuen Wan West', realZh: '荃灣西', displayEn: 'Tsuen Wan East', displayZh: '荃灣東', displayJa: 'チュエンワンイースト' },
  { id: 'shek-kip-mei', realEn: 'Shek Kip Mei', realZh: '石硤尾', displayEn: 'Shek Kip Head', displayZh: '石硤頭', displayJa: 'シェキキップヘッド' },
  { id: 'kowloon-tong', realEn: 'Kowloon Tong', realZh: '九龍塘', displayEn: 'Kowloon University', displayZh: '九龍大學', displayJa: 'クーロンユニバーシティ' },
  { id: 'lok-fu', realEn: 'Lok Fu', realZh: '樂富', displayEn: 'Tiger', displayZh: '老虎', displayJa: 'タイガー' },
  { id: 'wong-tai-sin', realEn: 'Wong Tai Sin', realZh: '黃大仙', displayEn: 'Blue Tai Sin', displayZh: '藍大仙', displayJa: 'ブルータイシン' },
  { id: 'diamond-hill', realEn: 'Diamond Hill', realZh: '鑽石山', displayEn: 'Gem Hill', displayZh: '寶石山', displayJa: 'ジェムヒル' },
  { id: 'choi-hung', realEn: 'Choi Hung', realZh: '彩虹', displayEn: 'Choi Wan', displayZh: '彩雲', displayJa: 'チョイワン' },
  { id: 'kowloon-bay', realEn: 'Kowloon Bay', realZh: '九龍灣', displayEn: 'Nine Phoenix Bay', displayZh: '九鳳灣', displayJa: 'ナインフェニックスベイ' },
  { id: 'ngau-tau-kok', realEn: 'Ngau Tau Kok', realZh: '牛頭角', displayEn: 'Ox Tail Point', displayZh: '牛尾角', displayJa: 'オックステイルポイント' },
  { id: 'kwun-tong', realEn: 'Kwun Tong', realZh: '觀塘', displayEn: 'Kwun Hall', displayZh: '觀堂', displayJa: 'クワンホール' },
  { id: 'lam-tin', realEn: 'Lam Tin', realZh: '藍田', displayEn: 'Green Field', displayZh: '綠田', displayJa: 'グリーンフィールド' },
  { id: 'yau-tong', realEn: 'Yau Tong', realZh: '油塘', displayEn: 'Oil Soup', displayZh: '油湯', displayJa: 'オイルスープ' },
  { id: 'tiu-keng-leng', realEn: 'Tiu Keng Leng', realZh: '調景嶺', displayEn: 'Tiu Keng Peak', displayZh: '調景峰', displayJa: 'ティウケンピーク' },
  { id: 'tseung-kwan-o', realEn: 'Tseung Kwan O', realZh: '將軍澳', displayEn: 'Tseung Bing O', displayZh: '將兵澳', displayJa: 'ツェンビンオー' },
  { id: 'hang-hau', realEn: 'Hang Hau', realZh: '坑口', displayEn: 'Hang Mei', displayZh: '坑尾', displayJa: 'ハンメイ' },
  { id: 'po-lam', realEn: 'Po Lam', realZh: '寶琳', displayEn: 'Po Chi Lam', displayZh: '寶之林', displayJa: 'ポーチーラム' },
  { id: 'lohas-park', realEn: 'LOHAS Park', realZh: '康城', displayEn: 'Hong Town', displayZh: '康鎮', displayJa: 'ホンタウン' },
  { id: 'whampoa', realEn: 'Whampoa', realZh: '黃埔', displayEn: 'Blue Po', displayZh: '藍埔', displayJa: 'ブルーポー' },
  { id: 'ho-man-tin', realEn: 'Ho Man Tin', realZh: '何文田', displayEn: 'Ho Mo Tin', displayZh: '何武田', displayJa: 'ホーモーティン' },
  { id: 'to-kwa-wan', realEn: 'To Kwa Wan', realZh: '土瓜灣', displayEn: 'Papaya Bay', displayZh: '木瓜灣', displayJa: 'パパイヤベイ' },
  { id: 'sung-wong-toi', realEn: 'Sung Wong Toi', realZh: '宋皇臺', displayEn: 'Chun Wong Terrace', displayZh: '秦王臺', displayJa: 'チュンウォンテラス' },
  { id: 'kai-tak', realEn: 'Kai Tak', realZh: '啟德', displayEn: 'Old Airport', displayZh: '舊機場', displayJa: 'オールドエアポート' },
  { id: 'hin-keng', realEn: 'Hin Keng', realZh: '顯徑', displayEn: 'Hin Lou', displayZh: '顯路', displayJa: 'ヒンロウ' },
  { id: 'che-kung-temple', realEn: 'Che Kung Temple', realZh: '車公廟', displayEn: 'Che Po Temple', displayZh: '車婆廟', displayJa: 'チェポーテンプル' },
  { id: 'sha-tin-wai', realEn: 'Sha Tin Wai', realZh: '沙田圍', displayEn: 'Sha Tin Ring', displayZh: '沙田圈', displayJa: 'シャティンリング' },
  { id: 'city-one', realEn: 'City One', realZh: '第一城', displayEn: 'City Two', displayZh: '第二城', displayJa: 'シティトゥー' },
  { id: 'shek-mun', realEn: 'Shek Mun', realZh: '石門', displayEn: 'Iron Gate', displayZh: '鐵門', displayJa: 'アイアンゲート' },
  { id: 'tai-shui-hang', realEn: 'Tai Shui Hang', realZh: '大水坑', displayEn: 'Big Fire Pit', displayZh: '大火坑', displayJa: 'ビッグファイアピット' },
  { id: 'heng-on', realEn: 'Heng On', realZh: '恒安', displayEn: 'Heng Lok', displayZh: '恒樂', displayJa: 'ヘンロク' },
  { id: 'ma-on-shan', realEn: 'Ma On Shan', realZh: '馬鞍山', displayEn: 'Ma On Sea', displayZh: '馬鞍海', displayJa: 'マーオンシー' },
  { id: 'wu-kai-sha', realEn: 'Wu Kai Sha', realZh: '烏溪沙', displayEn: 'Wu Kai Rock', displayZh: '烏溪石', displayJa: 'ウーカイロック' },
  { id: 'nam-cheong', realEn: 'Nam Cheong', realZh: '南昌', displayEn: 'Bak Cheong', displayZh: '北昌', displayJa: 'バクチョン' },
  { id: 'austin', realEn: 'Austin', realZh: '柯士甸', displayEn: 'Tung Si Din', displayZh: '痌屎癲', displayJa: 'トンシーディン' },
  { id: 'kam-sheung-road', realEn: 'Kam Sheung Road', realZh: '錦上路', displayEn: 'Kam Ha Road', displayZh: '錦下路', displayJa: 'カムハーロード' },
  { id: 'tin-shui-wai', realEn: 'Tin Shui Wai', realZh: '天水圍', displayEn: 'Dei Shui Wai', displayZh: '地水圍', displayJa: 'デイシュイワイ' },
  { id: 'siu-hong', realEn: 'Siu Hong', realZh: '兆康', displayEn: 'Siu Gin', displayZh: '兆健', displayJa: 'シウジン' },
  { id: 'tuen-mun', realEn: 'Tuen Mun', realZh: '屯門', displayEn: 'Tuen Bing', displayZh: '屯兵', displayJa: 'トゥエンビン' },
  { id: 'mong-kok-east', realEn: 'Mong Kok East', realZh: '旺角東', displayEn: 'Mong Kok West', displayZh: '旺角西', displayJa: 'モンコクウエスト' },
  { id: 'tai-wai', realEn: 'Tai Wai', realZh: '大圍', displayEn: 'Siu Wai', displayZh: '小圍', displayJa: 'シウワイ' },
  { id: 'sha-tin', realEn: 'Sha Tin', realZh: '沙田', displayEn: 'Old City', displayZh: '舊城市', displayJa: 'オールドシティ' },
  { id: 'fo-tan', realEn: 'Fo Tan', realZh: '火炭', displayEn: 'Bing Tan', displayZh: '冰炭', displayJa: 'ビンタン' },
  { id: 'racecourse', realEn: 'Racecourse', realZh: '馬場', displayEn: 'Ox Course', displayZh: '牛場', displayJa: 'オックスコース' },
  { id: 'university', realEn: 'University', realZh: '大學', displayEn: 'Secondary School', displayZh: '中學', displayJa: 'セカンダリースクール' },
  { id: 'tai-po-market', realEn: 'Tai Po Market', realZh: '大埔墟', displayEn: 'Tai Po Mart', displayZh: '大埔市', displayJa: 'タイポーマート' },
  { id: 'tai-wo', realEn: 'Tai Wo', realZh: '太和', displayEn: 'Tai Ping', displayZh: '太平', displayJa: 'タイピン' },
  { id: 'fanling', realEn: 'Fanling', realZh: '粉嶺', displayEn: 'Fan Hill', displayZh: '粉山', displayJa: 'ファンヒル' },
  { id: 'sheung-shui', realEn: 'Sheung Shui', realZh: '上水', displayEn: 'Ha Shui', displayZh: '下水', displayJa: 'ハーシュイ' },
  { id: 'lo-wu', realEn: 'Lo Wu', realZh: '羅湖', displayEn: 'Lo Hoi', displayZh: '羅海', displayJa: 'ローホイ' },
  { id: 'lok-ma-chau', realEn: 'Lok Ma Chau', realZh: '落馬洲', displayEn: 'Mount Horse Isle', displayZh: '上馬洲', displayJa: 'マウントホースアイル' },
  { id: 'tsing-yi', realEn: 'Tsing Yi', realZh: '青衣', displayEn: 'Tsing Saam', displayZh: '青衫', displayJa: 'チンサーム' },
  { id: 'sunny-bay', realEn: 'Sunny Bay', realZh: '欣澳', displayEn: 'Joyful Bay', displayZh: '歡澳', displayJa: 'ジョイフルベイ' },
  { id: 'tung-chung', realEn: 'Tung Chung', realZh: '東涌', displayEn: 'West Chung', displayZh: '西涌', displayJa: 'ウエストチュン' },
  { id: 'airport', realEn: 'Airport', realZh: '機場', displayEn: 'Aeroplane', displayZh: '飛機', displayJa: 'エアロプレーン' },
  { id: 'asiaworld-expo', realEn: 'AsiaWorld-Expo', realZh: '博覽館', displayEn: 'Expo City', displayZh: '博覽城', displayJa: 'エキスポシティ' },
  { id: 'ocean-park', realEn: 'Ocean Park', realZh: '海洋公園', displayEn: 'Ocean Garden', displayZh: '海洋花園', displayJa: 'オーシャンガーデン' },
];

/** Extra parody names reserved for future levels / docs. */
export const STATIONS_EXTRA: StationDef[] = [];

const byRealEn = new Map(STATIONS.map((s) => [s.realEn, s]));
const byDisplayEn = new Map(STATIONS.map((s) => [s.displayEn, s]));

export function stationByRealEn(realEn: string): StationDef | undefined {
  return byRealEn.get(realEn);
}

export function stationByDisplayEn(displayEn: string): StationDef | undefined {
  return byDisplayEn.get(displayEn);
}

/**
 * Kana reading for the in-car announcement. Uses `displayJa` when the stop has one.
 * A later stop with no reading is still spoken in kana, never as raw English.
 */
export function stationReading(displayEn: string): string {
  const known = stationByDisplayEn(displayEn)?.displayJa;
  if (known) return known;
  const reading = displayEn
    .split(/[^A-Za-z]+/)
    .filter(Boolean)
    .map((word) => spellKatakana(word))
    .join('');
  return reading || displayEn;
}

const KANA_DIGRAPHS: Array<[string, string]> = [
  ['tch', 'ッチ'],
  ['sch', 'シュ'],
  ['igh', 'アイ'],
  ['ch', 'チ'],
  ['sh', 'シ'],
  ['ph', 'フ'],
  ['th', 'ス'],
  ['wh', 'ウ'],
  ['ck', 'ック'],
  ['qu', 'ク'],
  ['ng', 'ング'],
  ['oo', 'ー'],
  ['ee', 'イー'],
  ['ai', 'アイ'],
  ['ay', 'エイ'],
  ['ow', 'アウ'],
  ['oa', 'オア'],
];

const KANA_LETTER: Record<string, string> = {
  a: 'ア', b: 'ブ', c: 'ク', d: 'ド', e: 'エ', f: 'フ', g: 'グ', h: 'ハ',
  i: 'イ', j: 'ジ', k: 'ク', l: 'ル', m: 'ム', n: 'ン', o: 'オ', p: 'プ',
  q: 'ク', r: 'ル', s: 'ス', t: 'ト', u: 'ウ', v: 'ブ', w: 'ウ', x: 'クス',
  y: 'イ', z: 'ズ',
};

/** Rough kana so a missing reading is still Japanese. New stops should set displayJa. */
function spellKatakana(word: string): string {
  const s = word.toLowerCase();
  let i = 0;
  let out = '';
  while (i < s.length) {
    const digraph = KANA_DIGRAPHS.find(([latin]) => s.startsWith(latin, i));
    if (digraph) {
      out += digraph[1];
      i += digraph[0].length;
      continue;
    }
    out += KANA_LETTER[s[i]] ?? '';
    i++;
  }
  return out;
}

/** Resolve theme / line lookup key (real English) from a display or real name. */
export function themeKeyFor(stationEn: string): string {
  return stationByDisplayEn(stationEn)?.realEn ?? stationByRealEn(stationEn)?.realEn ?? stationEn;
}

/** Operator branding (fictional). */
export const OPERATOR_ZH = '香城鐵路';
export const OPERATOR_EN = 'Hong City Rail';
export const OPERATOR_SHORT = 'HCR';
