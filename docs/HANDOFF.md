# Handoff: continue Exit Rush from v0.8.1 → App Store

> **Paste-in prompt for Grok Build on Kingsley's MacBook.**  
> Clone / pull this repo, open Grok Build in the repo root (it reads `AGENTS.md`), then paste:
>
> ```text
> Read docs/HANDOFF.md end-to-end and execute it in priority order (sections 1→6).
> Do not push unless I explicitly say so. Review screenshots before calling anything done.
> ```
>
> This file is the **single source of truth** for the next local build session.  
> Older kickoff text in `docs/GROK_BUILD_PROMPT.md` now points here.

---

## 0. Hard house rules (never break)

1. **Never** write the real HK railway operator's name, abbreviation, `港鐵`, logos, fonts, or audio — not in UI, store text, code, comments, filenames, bundle id, or keywords. Operator in-game is **香城鐵路 / Hong City Rail** only (`docs/STATIONS.md`).
2. **Hero behaviour unchanged** — `modsFor(hero, …)` golden parity must keep passing (`npm run test:sim`).
3. Web GitHub Pages must keep working: `BASE_PATH=/exit-rush/` build.
4. Save key stays `exit-rush-v1` (migrations in `src/game/storage.ts`).
5. Sim stays three.js-free (`src/game/sim/**`). Render/VFX stay in `src/game/{Effects,TrainScene,Crowd,Passenger,characters}.ts`.
6. Every new player-facing string → **both** `src/i18n/en.ts` and `src/i18n/zh-HK.ts` (colloquial Cantonese).
7. **Review screenshots** (390×844@2x) before claiming done. Capture scripts: `scripts/capture-v08.mjs`, `scripts/capture-v081.mjs`.
8. **No push / no App Store upload** unless Kingsley explicitly asks.

---

## 1. Current state — v0.8.1

**Version:** `package.json` → `0.8.1` (live web was v0.8.0 Mage launch).

### What shipped in 0.8.0–0.8.1
| Area | Status | Key paths |
|------|--------|-----------|
| Mage 「凱婷」 | Playable (web unlocks all) | `src/game/charactersDef.ts`, `SpellTree.ts`, `sim/abilities.ts` |
| Gear L 「裝備L」 | **Coming soon** card only | `src/ui/characterSelect.ts` (`COMING_SOON.tech`) |
| Per-character progress (D12) | **Done in 0.8.1** | `src/game/storage.ts` (`progress`, `recordClear`, `progressOf`) |
| Element colours | Fire **red** / Ice **blue** / Volt **yellow** | `Effects.ts`, `style.css` `.el-fire/.el-ice/.el-volt` |
| Entitlements | Stub (web = all unlocked) | `src/game/entitlements.ts`, `src/game/platform.ts` (`VITE_PLATFORM`) |
| Balance bot | Hero + Mage | `scripts/simTest.ts` — `CHARS=hero,mage LEVEL=… RUNS=40 npm run test:sim` |
| Captures | Staging shots | `/workspace/v081/*.png` (agent box); locally use `scripts/capture-v081.mjs` |

### Architecture map
```
src/game/sim/**          Pure sim (no three.js): Sim, CrowdSim, PlayerSim, abilities, tuning
src/game/charactersDef.ts CharacterDef + modsFor() (hero golden parity)
src/game/storage.ts       SaveData, normalizeSave migrations, per-character progress
src/game/entitlements.ts  canPlay / buy / restore stubs — wire RevenueCat here
src/game/platform.ts      IS_STORE_BUILD / VITE_PLATFORM=web|ios
src/game/Effects.ts       VFX pools (fire/ice/volt)
src/ui/*                  Menus, HUD, character select, spellbook
docs/CHARACTERS.md        Mage + Gear L GDD (D12 = separate progress)
docs/APP_STORE.md         Capacitor + store checklist
docs/BALANCE.md           Win-rate bands
```

### Save / migration (know this before touching progress)
- `SaveData.progress.{hero,mage,tech}`: `{ cleared, clears, highestCleared, seenBosses }`
- Top-level `cleared` / `clears` / `highestCleared` / `seenBosses` are **mirrors of the active character** (`syncTopLevelProgress`)
- Pre-0.8.1 saves: all clears → **hero**; Mage SP refunded unless backed by Mage clears (`clearedWith` seeds); one-time `progressSplitNotice`
- SP/coins derive from **that character's** first clears only (`earnedFrom(progressOf(save).cleared)`)
- Hero skills/loadouts stay at top-level; Mage loadouts in `save.mage`

### Acceptance for “v0.8.1 still healthy”
```bash
npx tsc --noEmit
npm run test:sim                          # includes per-character migration test
CHARS=hero,mage LEVEL=1,10,20,40,60,70,80,100 LOADOUTS=earned RUNS=40 npm run test:sim
BASE_PATH=/exit-rush/ npm run build
```
Mage Δ vs hero should stay within **±10 pp** on sampled levels.

### Known polish left (non-blocking)
- Mage ult button styling vs T1 fire (both flame icons) — keep T1 always visible with CD pie
- Fire VFX: prefer NormalBlending deep red (`#e0201a`); avoid additive white cores (wash → pink)
- Volt: saturated `#ffd400` body + thin white core only
- Who-chip format: `凱婷 0/100` (not long「已通關」strings)

---

## 2. Gear L 「裝備L」 (next major gameplay)

**Spec:** `docs/CHARACTERS.md` §5 (Tech / Gear L). Enable the card when playable (remove `COMING_SOON.tech`).

### Implement (concrete)
| Piece | Where | Notes |
|-------|-------|-------|
| Coins | Derive from **tech** `progress.tech.cleared` + replay ledger (see CHARACTERS §5.6) — do **not** share Hero clears | Mirror SP pattern in `storage.ts` |
| Shop UI | New `src/ui/techShop.ts` (or similar) | 平 / 中價 / 名貴 tiers; prices in CHARACTERS |
| Polyomino backpack | New grid model + UI | 2×2 → 4×4 expansions; rotate pieces; consumables **occupy cells** |
| 3 loadouts | `save.tech.sets[0..2]` already stubbed | `TechProgress` in `storage.ts` |
| Items / effects | `src/game/sim/` hooks + `modsFor` tech branch | Must not alter hero `modsFor` bit-identity |
| Character select | Unlock Tech when entitled | `entitlements().canPlay('tech')` |
| i18n | Shop, tiers, empty-grid copy | en + zh-HK |

### Acceptance
```bash
npx tsc --noEmit
CHARS=hero,mage,tech LEVEL=1,10,20,40,60,70,80,100 LOADOUTS=earned RUNS=40 npm run test:sim
# Tech earned win% within ±10 pp of hero on each sampled level
# L100: tech best kit within ±10 pp of hero best ult band (docs/BALANCE.md)
```
Capture: character select (Gear L playable), shop, backpack editor, one in-run Tech HUD shot — READ before done.

### Balance bot
Extend `scripts/simTest.ts` loadouts: `tech:earned`, `tech:kit:…`, `tech:grid4` (see CHARACTERS §8). Shop policy: greedy + expand grid when coins allow.

---

## 3. Capacitor iOS wrap

**Spec:** `docs/APP_STORE.md` §B / Phase 1 in §G. Older detailed prompt: was inlined in `GROK_BUILD_PROMPT.md` (now superseded by this handoff).

### Do
1. Branch `feat/ios-capacitor` (do not push to main unless asked).
2. Capacitor 8.x: `@capacitor/core`, `@capacitor/ios`, CLI, App, Haptics, StatusBar, Preferences, SplashScreen, keep-awake, `-D @capacitor/assets`.
3. `capacitor.config.ts`: `appId: 'com.kingsleykwan.exitrush'` (**confirm with Kingsley before first upload** — immutable after first binary), `webDir: 'dist'`, portrait, dark bg `#141820`.
4. Scripts: `build:native` (`tsc && vite build --base /`), `cap:sync`, `ios:open`, `ios:run`, `assets:ios`.
5. `VITE_PLATFORM=ios` for store builds (`src/game/platform.ts` already keys off this).
6. `src/native/`: Preferences save bridge (hydrate **before** `new Game`), haptics bridge, status bar, keep-awake, pause sync with existing visibility path.
7. Commit `ios/` except `ios/App/App/public/`.
8. PrivacyInfo.xcprivacy (UserDefaults CA92.1), ITSAppUsesNonExemptEncryption NO, iPhone only, portrait only.

### Acceptance
```bash
npm run build
BASE_PATH=/exit-rush/ npm run build   # Pages still works
npm run build:native && npx cap sync ios
npm run test:sim
# Simulator screenshots: menu, L1 HUD, skills, result — EN + 粵; check safe areas
```

---

## 4. IAP via RevenueCat

**Spec:** `docs/CHARACTERS.md` §6–8, `docs/APP_STORE.md` ads/IAP sections.

### Products (App Store Connect + RevenueCat)
| Product id (suggested) | Price | Entitlement |
|------------------------|-------|-------------|
| `exitrush.char.mage` | US$2.99 | `mage` |
| `exitrush.char.tech` | US$2.99 | `tech` |
| `exitrush.chars.bundle` | US$4.99 | `mage` + `tech` |
| `exitrush.noads` | US$2.99 | `noAds` |

**Rules:**
- Wire purchase / restore into `src/game/entitlements.ts` (replace stubs). Cache in `save.entitlementCache`; StoreKit/RC is source of truth on launch + Restore.
- **Restore Purchases** button on character select + Settings (already stubbed in UI).
- **Any character purchase removes interstitials** (rewarded ads may stay opt-in). `noAds` alone also removes interstitials.
- Hide bundle offer once either character is owned; show only the remaining single.
- **Family Sharing:** ASC toggle is **irreversible**. Needs **Kingsley's explicit OK** before enabling — do not turn on by default.
- Web (`VITE_PLATFORM=web`): keep demo unlock; **never mention the free web demo inside the iOS app or App Store text**.

### Acceptance
- StoreKit Configuration / sandbox: buy Mage, restore on reinstall, revoke → locked but progress data retained.
- Bundle grants both; interstitial flag off after any char / noAds.
- `npm run test:sim` + tsc still green; web build unchanged.

---

## 5. App Store submission checklist

Work from `docs/APP_STORE.md` §A / §G. Owner actions Kingsley must do in browser/Xcode:

- [ ] Apple Developer Program + **Paid Apps Agreement** + banking/tax
- [ ] Bundle id registered: suggested `com.kingsleykwan.exitrush`
- [ ] App Store Connect record (SKU e.g. `exitrush-ios-001`)
- [ ] Privacy policy URL (hosted; linked in ASC + in-app About)
- [ ] Age rating questionnaire
- [ ] Screenshots (6.7" + 6.1" at minimum): menu, run, Mage spell, (later Gear L) — **no web-demo mention**
- [ ] Description: fictional 香城鐵路 disclaimer; no real-operator marks
- [ ] Review notes: offline game, IAP for optional characters, Restore location
- [ ] Encryption export: ITSAppUsesNonExemptEncryption = NO
- [ ] TestFlight internal → external → Submit

**Agent deliverable before Kingsley submits:** release branch built with `VITE_PLATFORM=ios`, RC products wired, screenshots reviewed, checklist ticks updated in `APP_STORE.md`.

---

## 6. Suggested work order on the MacBook

1. Pull latest / apply v0.8.1 source; run §1 acceptance commands.
2. **Gear L** (§2) until balance ±10 pp — biggest design surface.
3. **Capacitor Phase 1** (§3) in parallel or after Gear L skeleton compiles.
4. **RevenueCat + entitlements** (§4) once native shell runs on device/sim.
5. **ASC metadata + screenshots** (§5); Kingsley clicks Submit.

### Everyday commands
```bash
npm run dev
npx tsc --noEmit
npm run test:sim
CHARS=hero,mage RUNS=40 npm run test:sim
BASE_PATH=/exit-rush/ npm run build
BASE_PATH=/ npm run build && npx vite preview --host 127.0.0.1 --port 4173
URL='http://127.0.0.1:4173/?debug=1' node scripts/capture-v081.mjs
```

### If stuck
- Balance: `docs/BALANCE.md` + `docs/CHARACTERS.md` pillars 1–3  
- Store: `docs/APP_STORE.md`  
- Stations/copy: `docs/STATIONS.md`  
- Agent map: `AGENTS.md`

---

*Generated for v0.8.1 handoff. Update this file when Gear L / iOS / IAP land.*
