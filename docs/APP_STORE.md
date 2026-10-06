# iOS App Store plan: 逼落車 / Exit Rush

> **Current mission for agents.** Read [`../AGENTS.md`](../AGENTS.md) first.
> Status (Oct 2026): web build v0.6.3 is live on GitHub Pages. **No native wrapper exists yet.** `.gitignore` has a placeholder entry
> for `ios/` and `android/`.
> Legend: 🤖 = an agent can do it in the repo · 👤 = **owner-only** (Kingsley: accounts, money, legal, Apple UI, device) ·
> **(to add)** = a script, file, or dependency that does **not** exist yet.

Facts checked against official sources on 2026-10-06 (links inline). Re-check anything marked "verify" before relying on it.

---

## A. Owner-only prerequisites 👤

| # | Task | Notes |
|---|------|-------|
| A1 | **Apple Developer Program**: enrol as an **Individual** (simplest; your legal name is shown as the seller) or as an Organisation (needs a D-U-N-S number) | US$99/year (local price varies). <https://developer.apple.com/programs/enroll/> · <https://developer.apple.com/support/compare-memberships/> |
| A2 | **A Mac with Xcode 26+** (or a cloud Mac / macOS CI) | Since **28 Apr 2026**, uploads must be built with **Xcode 26+ and the iOS 26 SDK** (<https://developer.apple.com/news/upcoming-requirements/>). Capacitor 8 also needs Xcode 26+ and supports iOS 15+ (<https://capacitorjs.com/docs/ios>). Options: your own Mac, MacStadium/AWS EC2 Mac, or CI on `macos-latest` / Codemagic. Archiving and uploading **can't** be done on Linux. |
| A3 | **Node 22 LTS** on the build machine | Capacitor 8 needs Node ≥ 22 (<https://capacitorjs.com/docs/getting-started/environment-setup>). |
| A4 | **Choose the bundle ID** and register it (Certificates, IDs & Profiles → Identifiers) | **Suggestion:** `com.kingsleykwan.exitrush`. It can't be changed after the first upload. **Keep it neutral — no real-operator name or abbreviation.** |
| A5 | **Signing**: in Xcode → Settings → Accounts, add your Apple ID, then select your Team in the target's *Signing & Capabilities* with "Automatically manage signing" on | Agents can't do this; it needs your Apple ID session. |
| A6 | **App Store Connect app record** (My Apps → + → New App): platform iOS, name, primary language, bundle ID, SKU (e.g. `exitrush-ios-001`) | <https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/> |
| A7 | **Agreements, tax and banking** (Business section). The *Paid Apps Agreement* is required before **any** IAP; AdMob needs its own payment profile | Only needed if v1 has IAP or ads. |
| A8 | **EU Digital Services Act trader status**: declare it or leave the EU out at launch | <https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/>. If you declare as a trader, your contact details are shown publicly in the EU. |
| A9 | **Physical iPhone** for testing (yours). Enable Developer Mode (Settings → Privacy & Security) the first time Xcode installs a build | |
| A10 | Decide: **v1 without ads** (recommended, see §E) or with ads/IAP | |

---

## B. Capacitor wrapper (Phase 1, 🤖 mostly)

Capacitor 8 is current: `@capacitor/core|cli|ios` **8.5.2** (npm, Oct 2026). New iOS projects use **Swift Package Manager** by default,
so CocoaPods isn't needed (<https://capacitorjs.com/docs/updating/8-0>). Docs: <https://capacitorjs.com/docs/getting-started>.

### B1. Install (on a branch, e.g. `feat/ios-capacitor`)

```bash
nvm use 22                                   # or any Node ≥ 22
npm i @capacitor/core
npm i -D @capacitor/cli
npm i @capacitor/ios
# native-feel plugins (all v8.x, peer @capacitor/core >= 8):
npm i @capacitor/app @capacitor/haptics @capacitor/status-bar @capacitor/preferences @capacitor/splash-screen
npm i @capacitor-community/keep-awake        # 8.0.1
npm i -D @capacitor/assets                   # 3.0.5, icon/splash generator
```

> ⚠ `pages.yml` runs on **Node 20**. `npm ci` still works (engine mismatches only warn by default), and the Pages build never
> runs `cap`. Still, bump `node-version: 22` in `pages.yml` in the same PR to keep it clean, then confirm the Pages deploy goes green.

### B2. `capacitor.config.ts` (to add, repo root)

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kingsleykwan.exitrush', // SUGGESTION: owner confirms (A4). Keep it neutral (no real-operator name).
  appName: '逼落車',                   // home-screen name (CFBundleDisplayName); store name is set in ASC
  webDir: 'dist',
  backgroundColor: '#141820',          // matches manifest background_color: no white flash
  ios: {
    contentInset: 'never',             // we handle safe areas in CSS (env(safe-area-inset-*))
    scrollEnabled: false,              // no rubber-band bounce on the game canvas
    backgroundColor: '#141820',
    // zoomEnabled defaults to false (Capacitor ≥ 6)
  },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 600, backgroundColor: '#141820', showSpinner: false },
  },
};
export default config;
```

Schema: <https://capacitorjs.com/docs/config>.

### B3. Base path: keep both Pages and native working

- `vite.config.ts` sets `base` from `BASE_PATH` (default `/`). Pages CI sets `BASE_PATH=/exit-rush/`.
- Native WKWebView serves `dist/` at `capacitor://localhost/`, so the native build **must use base `/`**.
- Use an explicit native build so a stray `BASE_PATH` in the shell can't break it. **Scripts to add** to `package.json`:

```jsonc
"build:native": "tsc && vite build --base /",          // CLI --base overrides config
"cap:sync":     "npm run build:native && cap sync ios",
"ios:open":     "cap open ios",
"ios:run":      "npm run cap:sync && cap run ios",
"assets:ios":   "capacitor-assets generate --ios"
```

- Don't touch the Pages path: `npm run build` plus the `BASE_PATH` env in `pages.yml` stays as it is.
- All runtime asset URLs already go through `publicUrl()` / `import.meta.env.BASE_URL` or are root-absolute in
  `index.html` (Vite rewrites those to the base). Keep it that way. Check: `grep -rn "exit-rush/" src` should only
  hit comments.
- Check both builds: `BASE_PATH=/exit-rush/ npm run build && grep -c '/exit-rush/assets' dist/index.html` (≥1), then
  `npm run build:native && grep -c '"/assets/' dist/index.html` (≥1).

### B4. Add and run iOS

```bash
npx cap init "逼落車" com.kingsleykwan.exitrush --web-dir dist   # or hand-write capacitor.config.ts (B2)
npx cap add ios                                                  # SPM template → ios/App/App.xcodeproj
npm run cap:sync                                                 # (to add) build + copy dist → ios/App/App/public
npx cap open ios                                                 # 👤 pick Team, run on Simulator / iPhone
npx cap run ios --list                                           # CLI device list (Mac only)
```

- **Commit `ios/`**: remove `ios/` from `.gitignore` (it was a "future" placeholder). Keep `ios/App/App/public/` ignored. That's the
  synced web copy, and `cap sync` regenerates it. Also ignore `ios/App/App/capacitor.config.json` only if you like; it's generated too.
- Capacitor injects its runtime into `index.html`, which needs a `<head>` (we have one).

### B5. Native iOS settings (in `ios/App/App/Info.plist` and the Xcode target)

| Setting | Value | Why |
|---------|-------|-----|
| `UISupportedInterfaceOrientations` | **Portrait only** (`UIInterfaceOrientationPortrait`) | Game is portrait-only (manifest `orientation: portrait`). |
| Devices (`TARGETED_DEVICE_FAMILY`) | **iPhone only (1)** for v1 | Avoids required iPad 13" screenshots and iPad layout QA. The app still runs on iPad in compatibility mode. Revisit later (guideline 2.4.1 encourages iPad). |
| `UIRequiresFullScreen` | `YES` | No Slide Over/Split View on iPad compatibility. |
| `ITSAppUsesNonExemptEncryption` | `NO` | No crypto beyond the OS. Skips the export questionnaire on every upload (<https://developer.apple.com/documentation/bundleresources/information-property-list/itsappusesnonexemptencryption>). |
| `UIStatusBarStyle` / `UIViewControllerBasedStatusBarAppearance` | light content; let the plugin control it | Dark UI. |
| `CFBundleDevelopmentRegion` + localisations | `zh-Hant` / `zh-HK` and `en` | So the system shows 繁中 where it applies. Add `InfoPlist.strings` for the display name if you want "Exit Rush" in English locales. |
| Deployment target | iOS 15.0 (Capacitor 8 minimum) or higher | Choose 16+ if WebGL/perf testing on iOS 15 is impractical. |
| `PrivacyInfo.xcprivacy` | Declare `NSPrivacyAccessedAPICategoryUserDefaults` reason `CA92.1` (needed when using `@capacitor/preferences`), `NSPrivacyTracking` false | <https://capacitorjs.com/docs/ios/privacy-manifest> · <https://capacitorjs.com/docs/apis/preferences> |

### B6. Status bar, safe area, notch / Dynamic Island

- `index.html` already has `viewport-fit=cover`, and CSS already uses `--safe-t/b/l/r` = `env(safe-area-inset-*)`. Keep
  `ios.contentInset: 'never'` so WKWebView doesn't add a second inset.
- On native boot: `StatusBar.setStyle({ style: Style.Dark })` (light text) and `StatusBar.setOverlaysWebView({ overlay: true })`
  (no-op on iOS, harmless). Optionally `StatusBar.hide()` while `game.screen === 'playing'` and `show()` on menus. If you do, check that
  the HUD still clears the Dynamic Island when the status bar is hidden (the safe-area top inset stays).
- QA on Simulator: iPhone 17 Pro (Dynamic Island), iPhone 17 Pro Max, iPhone SE 3rd gen (home button, no notch).
  Screenshot the menu, the HUD in a run, the skill tree, and the result overlay in both languages.

### B7. Disable bounce, zoom, selection, callouts

- Config: `ios.scrollEnabled: false`, zoom disabled by default.
- CSS already has `user-select: none` and `touch-action: none` on the play surface. Also check `-webkit-touch-callout: none`
  and `-webkit-tap-highlight-color: transparent` on `html, body`, and add them if missing.
- Long-pressing an image or link must not open a preview. Set `ios.allowsLinkPreview: false` if needed.

### B8. Audio on iOS

- `Audio.ts` already creates one `AudioContext` lazily and calls `unlock()` → `ctx.resume()` on the first gesture. In WKWebView this
  works the same as in Safari.
- Web Audio in WKWebView follows the **Ring/Silent switch** (ambient-style session). That's the expected behaviour (guideline 2.5.9: don't
  override standard switches). Document it in the review notes and FAQ; don't try to bypass it.
- Add: on `@capacitor/app` `resume`, call the existing resume path. Handle `ctx.state === 'interrupted'` (phone call / Siri) by
  re-calling `resume()` on the next user gesture.
- Test: start a run → incoming call (or Siri) → return. Game should be paused, audio resumes after you tap Resume.

### B9. Haptics (native value, part of the 4.2 mitigation)

- `src/game/haptics.ts` uses `navigator.vibrate`, which iOS ignores. That's about 13 call sites (`haptic(pattern, minGapMs)`), plus `setHapticsEnabled()`.
- Keep the **same API**. On native, call `@capacitor/haptics` instead (<https://capacitorjs.com/docs/apis/haptics>):
  - single pulse ≤ 15 ms → `Haptics.impact({ style: ImpactStyle.Light })`
  - ≤ 40 ms → `Medium`, longer → `Heavy`
  - array patterns (win / lose) → `Haptics.notification({ type: NotificationType.Success | Error })`
- Keep the existing throttle. Respect the in-game toggle and `prefers-reduced-motion` if it's wired. Load the plugin with a dynamic
  `import()` behind `Capacitor.isNativePlatform()` so the web bundle doesn't grow.

### B10. Keep awake

`@capacitor-community/keep-awake`: call `KeepAwake.keepAwake()` when a run starts and `allowSleep()` on pause, result, or menu.
Runs are 10–25 s, so the gain is small. It mostly matters for the menu → run → retry loop. <https://github.com/capacitor-community/keep-awake>

### B11. Save persistence: localStorage → Capacitor Preferences

WKWebView `localStorage` usually survives, but iOS can evict website data under storage pressure. Native storage is safer
(Preferences → `UserDefaults`, which is cleared on uninstall).

Plan (keep `storage.ts` **synchronous** for the game; add async hydration at boot):

Save key: `exit-rush-v1` (since v0.6.3). On first load `storage.ts` copies any pre-rename web keys to the matching
`exit-rush…` key and deletes the old ones (same origin `kingsleykwan.github.io`, so web progress carries over). Native
builds start fresh, so the bridge only needs the new key.

1. **(to add)** `src/native/saveBridge.ts`: `hydrateNativeSave(): Promise<void>`. On native: `Preferences.get({ key: 'exit-rush-v1' })`.
   If it has a value, `localStorage.setItem(KEY, value)`, because Preferences is the source of truth.
   If it's empty but `localStorage` has a save (first launch after this update), copy localStorage → Preferences (migration).
2. In `main.ts`: `await hydrateNativeSave()` **before** `new Game(...)`. On web it resolves immediately.
3. In `writeSave()`: keep the localStorage write, and on native also fire-and-forget `Preferences.set(...)` with the same JSON.
4. Keep the key name and `normalizeSave()` unchanged. Add a test-like check: load a v0.5 save (with `wis`) → still migrates.
5. Save data stays **on device only**. No iCloud / accounts in v1, which keeps the privacy label at "Data Not Collected".

### B12. Offline assets

Everything is already bundled: three.js, OFL fonts in `public/fonts/`, key art and portraits WebP, and audio is synthesised. `src/` has no
network URLs. On native, `cap sync` copies `dist/` into the app, so the game **works in Airplane Mode** with no service worker needed.
Test it: install, enable Airplane Mode, cold-launch, play L1 and L100 (if unlocked). Ads (if added) must fail quietly offline.

### B13. Lifecycle

Hook `@capacitor/app` `pause` → the same handler as `visibilitychange`/`pagehide` (auto-pause, suspend audio), and `resume` → keep the game
paused and wait for the player to tap Resume (the door timer must never run hidden). <https://capacitorjs.com/docs/apis/app>

---

## C. App icon 1024 + launch screen (🤖 generate, 👤 approve)

- Source: `store/app-icon-1024.png` (1024×1024, **RGB, no alpha**: App Store icons must not have transparency). It was generated with
  Grok Image via `scripts/art/build_art.py`.
- **(to add)** `assets/icon-only.png` (copy of the 1024 icon), `assets/splash.png` and `assets/splash-dark.png` (≥ 2732×2732; centre the
  logo/key art on `#141820`). You can build the splash from `public/art/key-art.webp` with Pillow by extending `build_art.py` or adding a small script.
- Generate: `npx capacitor-assets generate --ios` (**to add** as `npm run assets:ios`). <https://capacitorjs.com/docs/guides/splash-screens-and-icons>
- Check the icon at 60/120/180 px. The wordmark must still read, and it must have **no real-operator-style marks** (no hollow-H, no red/white roundel resembling the real logo).
- iOS 26 shows icons with the new "Liquid Glass" treatment, plus optional dark/tinted variants via an Icon Composer `.icon` file. A plain
  1024 PNG is still accepted. Optional polish for later (verify current Xcode guidance).

---

## D. Performance on iPhone (🤖 implement, 👤 test on device)

Current levers (`src/game/quality.ts`, `Game.ts`, `TrainScene.ts`):

| Lever | Today | Suggested native tuning |
|-------|-------|-------------------------|
| Pixel ratio | high = `min(DPR, 2)`, low = 1 | iPhones are DPR 3. Add a **mid** cap of 1.5 on native `auto` if high misses 60 fps. Fragment cost scales with ratio² (2.0 → 1.5 ≈ −44 % pixels). |
| Antialias | on for high (fixed for the life of the context) | At DPR ≥ 2 MSAA is costly and less visible. Consider off for native mid. |
| Shadows | PCF, 1024² map, high only | Try 512² or `BasicShadowMap` for mid. Blob shadows stay on low. |
| Crowd | ≤ 96 bodies, instanced per look | **Don't change counts** (that changes gameplay). Optimise render only: frustum culling, fewer draw calls, cheaper materials. |
| FPS probe | 2.5 s window, < 45 fps → low, cached | Keep it. Consider re-probing on native after the first L20+ run. |

**Checks (record the numbers in the PR):**

1. Safari → Develop → [iPhone] → the app's WebView → **Timelines** (JS + rendering) on L1, L30, and L100. Targets: ≥ 55 fps average,
   no frame > 50 ms during door-close beeps.
2. Xcode → Debug Navigator: CPU / GPU / Energy impact. Then a **10-minute soak** (menu → run → retry loop): the device shouldn't get hot,
   and thermal state should stay "nominal/fair".
3. **Low Power Mode**: WebKit may throttle `requestAnimationFrame` to ~30 fps. The fixed-step accumulator should keep the sim correct.
   Check that the game still feels fair (timer is sim time, not wall time; confirm).
4. Memory: Safari Web Inspector → Timelines → Memory. No growth across 20 retries (geometry/texture disposal).
5. Cold-start time to the interactive menu should be < 3 s on a mid-range iPhone. `three` is already a separate chunk.
6. `npm run test:sim` must still pass. Its ms/step column catches sim regressions.

Test devices (👤): your own iPhone, plus the oldest iPhone you can borrow (A13–A15), plus iPhone SE in the Simulator for layout.

---

## E. Monetisation (from `review/REVIEW_v2.md` §D). Optional for v1

**Recommendation: ship v1.0 free with no ads and no IAP.** It's the fastest review, the privacy label is "Data Not Collected", there's no ATT
prompt, and you don't need the Paid Apps Agreement. Add monetisation in 1.1 once TestFlight/D1 data exists.

When you add it (hybrid-casual, ads first, per the review):

| Element | Rule |
|---------|------|
| **Rewarded video** (opt-in) | Revive once per run, or +3 s door time. Optional, per review: double SP on first clear (changes the SP economy, so check with `test:sim`/BALANCE first). |
| **Interstitial** | At most one every **2–3 level ends**, with a 30–45 s cooldown. **Never** before the first win, never mid-run, never right after a rewarded ad, and never on a fail unless a rewarded alternative (revive) was offered. |
| **Remove Ads** IAP | **Non-consumable**, ~US$2.99–4.99 (pick an ASC price tier). Removes interstitials. Rewarded stays optional. Needs a **Restore Purchases** button (guideline 3.1.1). Show prices from StoreKit, never hard-coded. |
| Later | Cheap hero skin pack. Battle pass only after D7 retention and weekly content. |

**Tech:**

- Ads: `@capacitor-community/admob` **8.2.0**. It bundles the Google Mobile Ads SDK plus UMP consent and ATT helpers (<https://github.com/capacitor-community/admob>).
  Info.plist: `GADApplicationIdentifier` (👤 from AdMob), `SKAdNetworkItems` (Google's list from <https://developers.google.com/admob/ios/quick-start>),
  and `NSUserTrackingUsageDescription` (only if you request ATT).
- **ATT:** request tracking permission only if you want personalised ads, and only after the first win, not at launch
  (<https://developer.apple.com/documentation/apptrackingtransparency>). Simpler: non-personalised ads only, no ATT prompt (lower eCPM).
  Either way, run the **UMP** consent flow for EEA/UK users.
- Set the AdMob max ad content rating to match the app's age rating (e.g. G/PG). Guideline 2.5.18: ads must suit the rating, have a visible
  close button, and let users report ads.
- **Test ad IDs (iOS, Google demo units):** interstitial `ca-app-pub-3940256099942544/4411468910`, rewarded
  `ca-app-pub-3940256099942544/1712485313`, rewarded interstitial `ca-app-pub-3940256099942544/6978759866`
  (<https://developers.google.com/admob/ios/test-ads>). **Never click live ads yourself.** Use test IDs or register test devices.
- IAP options: **RevenueCat** `@revenuecat/purchases-capacitor` 13.7.0 (hosted receipts, restore, analytics: <https://www.revenuecat.com/docs/getting-started/installation/capacitor>),
  or direct StoreKit 2 via `@capgo/native-purchases` 8.8.1 (<https://github.com/Cap-go/capacitor-native-purchases>). For one non-consumable,
  either works. Use a StoreKit configuration file for Simulator tests and a Sandbox tester (👤) on device.
- Ads change the **App Privacy** answers (Google's guide: <https://developers.google.com/admob/ios/privacy/data-disclosure>) and the privacy policy
  (`docs/PRIVACY_POLICY.md`). The Google SDK ships its own privacy manifest.

---

## F. App Store requirements

### F1. Privacy policy URL (required for every app, guideline 5.1.1(i); link it in ASC **and** inside the app)

- Draft: [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md) (👤 review). Host it as a static page, e.g. **(to add)** `public/privacy.html` →
  `https://kingsleykwan.github.io/exit-rush/privacy.html`.
  (The repo was renamed to `exit-rush` in v0.6.3, so the Pages URL is neutral; `BASE_PATH=/exit-rush/` in `pages.yml`.)
- **(to add)** an in-app link (menu → ⓘ About: version, privacy policy, support, "not affiliated with any real railway", OFL credits).
- Support URL (required): GitHub Issues, or a `support.html` page with a contact email (👤 choose the email).

### F2. App Privacy "nutrition label" (👤 answers in ASC; <https://developer.apple.com/app-store/app-privacy-details/>)

- **v1 without ads/analytics:** "Data Not Collected". Saves stay on the device and nothing is transmitted.
- **With AdMob:** follow Google's disclosure guide (typically Identifiers → Device ID, Usage Data → Advertising Data/Product Interaction,
  Diagnostics, coarse Location from IP, marked as used for Third-Party Advertising; "Used to Track You" if personalised + ATT).
- With RevenueCat: Purchases → Purchase History (App Functionality).

### F3. Age rating

Fill in the **new questionnaire** (4+/9+/13+/16+/18+ since 2025, required since 31 Jan 2026: <https://developer.apple.com/help/app-store-connect/reference/age-ratings>).
Answer honestly. The game has cartoon shoving of passengers (likely "infrequent/mild cartoon or fantasy violence") and gross-out humour
(stench guy), and no gambling, UGC, or web access. The expected result is **9+** (verify in ASC). Ads require answering the advertising/in-app controls items.
Don't choose "Made for Kids" (that would forbid third-party ads).

### F4. Content rights and the parody (guidelines 4.1, 5.2.1, 2.3.7)

- ASC asks "Does your app contain, show, or access third-party content?" → **No**. All art, audio, and code are original, and fonts are OFL (credit them in About).
- The operator is the fictional **香城鐵路 / Hong City Rail**. No real-operator name, logo, livery mark, typeface, or announcement audio anywhere,
  **including keywords, screenshots, and the icon**. Station names are parodies of place names (`docs/STATIONS.md`), never the operator brand.
- Put "Fiction / parody, not affiliated with any real railway operator" in the description and the About screen.
- 👤 Optional: a quick check with an HK IP lawyer if you're worried about the station-name parodies or the overall look. See §H.

### F5. Export compliance

`ITSAppUsesNonExemptEncryption = NO` in Info.plist (§B5). ASC will then skip the questionnaire.
Background: <https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/>

### F6. Screenshots (<https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>)

- 1–10 per size, JPEG/PNG, **no alpha**, and they must **show the app in use** (2.3.3). In-run gameplay, not just key art.
- iPhone sizes (portrait):
  - **6.9" (iPhone 16/17/18 Pro Max, Air):** **1320×2868** (also accepted: 1290×2796, 1260×2736). Upload this as the master set; ASC scales it down.
  - **6.5" (iPhone 11 Pro Max / XS Max class):** 1284×2778 or 1242×2688. Only needed if you don't provide the 6.9" set.
  - Apple's page (Oct 2026) lists "iPhone with Dynamic Island (medium display)" (1206×2622 / 1179×2556) as the required iPhone size.
    Upload the 6.9" set and confirm in ASC whether it also asks for 6.3". If it does, capture 1206×2622 too.
  - iPad 13" (2064×2752) only if you ship iPad support (v1: iPhone only).
- **(to add)** `scripts/capture-store.mjs`: Playwright, or better, the iOS Simulator (`xcrun simctl io booted screenshot`) for a real
  status bar and Dynamic Island. Shots: L1 FTUE, L6 luggage intro card, mid-run L24 mix, skill constellation, level select, L100 fireworks.
  Make an EN set and a 繁中 set. Optional caption overlays (allowed).
- Optional app preview video (15–30 s, screen capture only).

### F7. Metadata drafts (👤 approve; limits: name 30, subtitle 30, keywords 100, promo text 170, description 4000)

| Field | English | 繁體中文 (Traditional Chinese / HK) |
|-------|---------|-----------------------|
| Name | `逼落車 Exit Rush` (13) | `逼落車 Exit Rush` |
| Subtitle | `Push off before doors close` (27) | `趕喺閂門前逼落車` |
| Promo text | `Rush hour. Packed car. Doors closing. Shove, weave and dash your way off the train in 10-second levels!` | `繁忙時間、迫爆車廂、車門就閂！十秒一關，推、閃、衝，一定要逼落車！` |
| Keywords | `train,crowd,commute,rush hour,push,shove,subway,metro,physics,casual,cantonese,doors,station` (no spaces after commas; ≤100) | `落車,逼車,繁忙時間,車廂,地鐵,乘客,推,廣東話,香港,休閒,物理,車門` |
| Category | Games → Casual (secondary: Action) | |
| Copyright | `© 2026 Kingsley Kwan` | |

**Never use** the real operator's name or abbreviation (English or Chinese, incl. `港鐵`), or any other real operator or app name, in keywords (2.3.7).
(Using `地鐵`/`subway`/`metro` as generic words is fine.)

Description (EN draft):

> Rush hour on Hong City Rail, and your stop is next. The car is packed, boarders are pushing in, and the doors are about to close.
> **Get off!**
> • 10–20 second levels. Drag anywhere to steer, hold the fist to charge a shove.
> • Meet the regulars: suitcase tourists, squatters, the stench guy, families, brats, couples, the angry man and the loudmouth on the phone.
> • Grow a constellation skill tree: Strength, Speed and Stamina, each with counters and an ultimate.
> • 31 levels across colour-themed parody stations, ending at the fireworks-night finale.
> • Bilingual: English and 廣東話. Original art and sound. Plays offline.
> Hong City Rail is fictional. This game is a parody and is not affiliated with any real railway operator.

Description (繁中 draft):

> 香城鐵路繁忙時間，下個站就到你落車——但車廂迫爆、外面啲人狂逼上車，車門就嚟閂！**快啲逼落車！**
> • 每關 10–20 秒：隨便拖動控制方向，㩒住拳頭蓄力推人。
> • 認識各位「車廂常客」：拉喼遊客、踎低客、惡臭人、一家大細、百厭仔、情侶、暴躁男，仲有講電話嘅大聲公。
> • 星座技能樹：力量、速度、體力，各有剋制技同終極技。
> • 31 關、每個惡搞車站各有主題色，最後挑戰煙花夜終極關。
> • 中英雙語、原創美術同音效、離線都玩得。
> 香城鐵路純屬虛構，本遊戲為惡搞作品，與任何真實鐵路公司無關。

### F8. TestFlight (<https://developer.apple.com/testflight/>)

1. 👤 Xcode → Product → Archive → Distribute App → App Store Connect → Upload (or `xcodebuild` + Transporter / CI).
2. Internal testing (up to 100 ASC users) works right away after processing. **External** testers (friends) need a quick Beta App Review.
3. Collect feedback on L26–30 difficulty, haptics feel, and FPS/heat. Iterate.

### F9. App Review notes (draft, 👤 paste into ASC)

> Exit Rush is a single-player, offline arcade game built with web technologies (three.js) inside a native Capacitor shell.
> No account or login is required. All progress is stored on device only. Native features: haptic feedback (Taptic Engine), portrait lock,
> keep-awake during play, native persistent storage, full offline play.
> How to test: the first launch auto-starts Level 1. Drag anywhere to move, hold the fist button to shove, and reach the open door (green markers) before the timer ends.
> Level 100 unlocks after Level 30.
> "Hong City Rail / 香城鐵路" is a fictional operator created for this parody. All art, audio and fonts are original or open-licensed (SIL OFL).
> The game is not affiliated with any real railway. Audio follows the Ring/Silent switch.
> [If IAP] "Remove Ads" is a non-consumable, under Menu → ⚙︎ → Remove Ads, and Restore Purchases is on the same screen.

---

## G. Phased checklist

### Phase 0: owner setup 👤
- [ ] A1 Enrol in the Apple Developer Program (Individual or Organisation)
- [ ] A2 Mac with Xcode 26+ (or cloud Mac / macOS CI) · A3 Node 22
- [ ] A4 Confirm bundle ID (suggested `com.kingsleykwan.exitrush`) and register it
- [ ] A6 Create the App Store Connect app record (name `逼落車 Exit Rush`, primary language)
- [ ] A8 Decide on EU DSA trader status (or exclude the EU at first)
- [ ] A10 Decide: v1 no ads (recommended) vs ads/IAP

### Phase 1: Capacitor wrapper 🤖 (branch `feat/ios-capacitor`)
- [x] 🤖 Install Capacitor 8 core/cli/ios + app/haptics/status-bar/preferences/splash-screen + keep-awake (§B1)
- [x] 🤖 `capacitor.config.ts` (§B2) · `package.json` scripts `build:native`, `cap:sync`, `ios:open`, `ios:run`, `assets:ios` (§B3)
- [x] 🤖 `npx cap add ios`, then commit `ios/` (fix `.gitignore`, keep `ios/App/App/public` ignored)
- [x] 🤖 Info.plist: portrait only, iPhone only, `UIRequiresFullScreen`, `ITSAppUsesNonExemptEncryption=NO`; `PrivacyInfo.xcprivacy` (§B5)
- [x] 🤖 `src/native/` bridge: platform detect, status bar, haptics routing, keep-awake, app pause/resume, Preferences save hydrate + migration (§B6–B13). Load everything with dynamic imports behind `isNativePlatform()`
- [x] 🤖 Bump `pages.yml` to Node 22. Verify `BASE_PATH=/exit-rush/ npm run build` still produces subpath URLs
- [x] 🤖 `npm run build` + `npm run build:native` + `npm run test:sim` all pass
- [ ] 👤 Open in Xcode, set the Team, and run on your iPhone (SE / home-button size still unchecked). `xcodebuild` for iPhone 17 Pro succeeded without a Team (`CODE_SIGNING_ALLOWED=NO`). That build was installed on the simulator: the title menu and L1 HUD clear the Dynamic Island and the home indicator.
- [x] 🤖 Screenshot review: menu, HUD, workshop, result, EN + 粵 at 390×844 @2x, plus the iPhone 17 Pro simulator title menu and L1 HUD. Home-button device shots are still 👤.

### Phase 2: native polish + performance
- [x] 🤖 Icon/splash sources in `assets/`, then `npm run assets:ios` (§C). Icon is `store/app-icon-1024.png` (no alpha). Splash is that art centred on `#141820`.
- [ ] 🤖 Native quality tuning (mid tier: DPR 1.5, cheaper shadows) behind a flag (§D)
- [ ] 👤 Safari Web Inspector timelines, 10-minute soak, Low Power Mode, Airplane Mode (§D, §B12)
- [ ] 🤖 In-app About screen: version, privacy link, support, parody disclaimer, OFL credits (EN + 粵)
- [ ] 🤖 Audio interruption handling (§B8)

### Phase 3: store assets and metadata
- [ ] 🤖 `public/privacy.html` from `docs/PRIVACY_POLICY.md` (after 👤 approval); support page
- [ ] 🤖 Store screenshot capture script + 6.9" (1320×2868) set (+ 6.3" if ASC asks), EN + 繁中 (§F6)
- [ ] 👤 Approve metadata (§F7). Fill in App Privacy (§F2), age rating (§F3), content rights (§F4) in ASC
- [ ] 👤 Archive → upload → TestFlight internal → external (§F8)

### Phase 4 (optional, 1.1): monetisation
- [ ] 👤 AdMob account, iOS app + ad units, payments profile · Paid Apps Agreement, tax, banking in ASC
- [ ] 👤 Create the Remove Ads non-consumable in ASC and a Sandbox tester
- [ ] 🤖 AdMob plugin + UMP + (optional) ATT + SKAdNetwork list + test IDs; interstitial/rewarded rules (§E)
- [x] 🤖 IAP code: RevenueCat adapter, Restore Purchases (character select + title settings), StoreKit config `ios/App/ExitRush.storekit` (`familyShareable: false` — do not turn Family Sharing on without Kingsley's OK). Sandbox buy/restore/revoke is still 👤 (needs `VITE_REVENUECAT_IOS_KEY` and a Sandbox Apple ID). Product ids: `exitrush.char.mage`, `exitrush.char.tech`, `exitrush.pack.chars`, `exitrush.noads`.
- [ ] 🤖 Update the privacy policy + 👤 update the App Privacy labels

### Phase 5: submit 👤
- [ ] Review notes (§F9), version 1.0.0 (build 1), release: manual
- [ ] Submit for review. Answer any rejection with specifics (see §H)

---

## H. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| **Trademark / brand** (real Hong Kong railway operator) | Fictional operator, no marks, fonts, or audio, no operator name/abbreviation or `港鐵` in metadata, keywords, icon, or bundle ID. Parody disclaimer in the description + About. Station names are parodies of place names (`STATIONS.md`, owner-curated). Repo renamed to the neutral `exit-rush` in v0.6.3 (`BASE_PATH=/exit-rush/`). |
| **Guideline 4.2 Minimum Functionality** ("repackaged website") | This is a full game, not a website. Add native value anyway: Taptic haptics, full offline play, native storage, portrait lock, keep-awake, no browser chrome, native splash/icon, and (later) IAP or Game Center leaderboards. Explain the native features in the review notes. Don't load the game from a remote URL (`server.url` is dev-only). |
| 4.3 Spam / copycat | Original mechanics and art. One bundle ID only. |
| 2.3.3 screenshots | Real gameplay captures, not key art only. |
| 2.1 crashes / perf on older iPhones | FPS probe + mid tier, device testing, soak test (§D). |
| Difficulty spike L27–30 (bot 13–32 %) | Playtest on TestFlight. Owner decides on retuning. |
| Ads hurting reviews / guideline 2.5.18 | Conservative caps (§E), ads rated for the age rating, no ads before the first win, Remove Ads IAP. |
| Privacy mismatch | Keep the label and policy in sync whenever an SDK is added. |
| Web build regression | CI Pages build stays unchanged. Run both builds in each PR. |
