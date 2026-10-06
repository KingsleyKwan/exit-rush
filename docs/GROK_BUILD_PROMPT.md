# Grok Build kickoff prompt

> **Updated for v0.8.1:** the single paste-in prompt is now **[`docs/HANDOFF.md`](./HANDOFF.md)**.
> On your MacBook: clone/pull the repo, run Grok Build in the repo root, then paste:
>
> ```text
> Read docs/HANDOFF.md end-to-end and execute it in priority order (sections 1→6).
> Do not push unless I explicitly say so. Review screenshots before calling anything done.
> ```
>
> The Phase 1 Capacitor prompt below is **archived** (still useful detail) but do **not** start from it alone — HANDOFF includes Gear L, IAP, submission, and current architecture.

---

# Grok Build kickoff prompt: iOS App Store, Phase 1

> **俾 Kingsley 嘅用法（廣東話）：**
> 1. 喺你部 Mac 度：`git clone https://github.com/KingsleyKwan/exit-rush.git && cd exit-rush`
> 2. 確認裝咗 Node 22（`node -v`）同 Xcode 26 或以上。
> 3. 喺 repo 根目錄行 `grok build`（Grok Build 會自動讀 `AGENTS.md`）。
> 4. 將下面「Prompt」嗰格成段 copy 晒貼落去，㩒 Enter。
> 5. 佢做完會報告；之後你要自己做嗰啲（Apple 帳戶、簽名 Team、喺 iPhone 試玩）會列晒出嚟。
> 呢份 prompt 只做 Phase 1（Capacitor 包殼 + iOS project），唔會 push 去 `main`、唔會加廣告。

---

## Prompt (copy everything inside the block)

```text
You are working in the repo for 逼落車 / Exit Rush, a Three.js + Vite + TypeScript mobile game (push your way off a packed
rush-hour train before the doors close) on the fictional operator 香城鐵路 / Hong City Rail.

STEP 0: READ FIRST (do not skip):
  1. AGENTS.md (project map, commands, hard rules)
  2. docs/APP_STORE.md (the mission: sections B, C, D and the Phase checklist in G)
  3. Skim README.md, docs/GAME_DESIGN.md, docs/LEVELS.md, docs/STATIONS.md, package.json, vite.config.ts,
     .github/workflows/pages.yml, src/game/storage.ts, src/game/haptics.ts, src/game/Audio.ts, src/game/quality.ts, src/main.ts.
  Then give me a 5-line summary of what you understood before changing anything.

HARD RULES (from AGENTS.md):
  - Never reference the real Hong Kong railway operator (name, abbreviation, 港鐵, trademarks, logos, fonts or audio) anywhere —
    UI, store text, code, comments, file names, bundle id, app name. Keep identifiers neutral (e.g. `exitrush`).
  - Parody station/line names come only from docs/STATIONS.md (owner-edited). Don't invent or rename any.
  - Every new player-facing string goes in BOTH src/i18n/en.ts and src/i18n/zh-HK.ts (colloquial Cantonese). Icon-first UI.
  - Keep the web build + GitHub Pages working (BASE_PATH=/exit-rush/ in pages.yml). Native code must be
    feature-detected with Capacitor.isNativePlatform() and loaded with dynamic import() so the web bundle doesn't grow much.
  - Don't change gameplay or balance (src/game/levels.ts, src/game/sim/**). The sim must stay three.js-free.
  - Don't rename the save key 'exit-rush-v1' (v0.6.3 already migrates pre-rename keys in src/game/storage.ts).
  - Work on a new branch `feat/ios-capacitor`. Do NOT push to main. Commit in small steps. Don't push at all unless I say so.
  - Don't add ads, IAP, analytics or any network calls in this phase.
  - Review your own screenshots before you say you're done.

PHASE 1 TASKS (docs/APP_STORE.md §B, Phase 1 in §G):
  1. Use Node >= 22. Install @capacitor/core, @capacitor/ios, -D @capacitor/cli (v8.x), plus @capacitor/app,
     @capacitor/haptics, @capacitor/status-bar, @capacitor/preferences, @capacitor/splash-screen,
     @capacitor-community/keep-awake, and -D @capacitor/assets.
  2. Create capacitor.config.ts as in §B2 (appId 'com.kingsleykwan.exitrush' is a SUGGESTION; put a TODO comment
     saying the owner must confirm it before the first upload). webDir 'dist', ios.contentInset 'never',
     ios.scrollEnabled false, backgroundColor '#141820'.
  3. Add package.json scripts: build:native ("tsc && vite build --base /"), cap:sync, ios:open, ios:run, assets:ios (§B3).
     Leave the existing dev/build/preview/test:sim scripts unchanged.
  4. Run `npx cap add ios` (SPM template). Edit .gitignore so ios/ IS committed but ios/App/App/public/ stays ignored.
  5. Info.plist / target: portrait only, iPhone only (TARGETED_DEVICE_FAMILY=1), UIRequiresFullScreen YES,
     ITSAppUsesNonExemptEncryption NO, light status bar text. Add ios/App/PrivacyInfo.xcprivacy with
     NSPrivacyAccessedAPICategoryUserDefaults reason CA92.1 and NSPrivacyTracking false, and add it to the App target.
  6. Create src/native/ (new folder), wired from src/main.ts:
       - platform.ts: isNative() helper
       - saveBridge.ts: hydrateNativeSave() awaited BEFORE `new Game(...)`. Preferences is the source of truth on native.
         On first native launch, migrate an existing localStorage save into Preferences. writeSave() also mirrors to
         Preferences on native (fire-and-forget). Web behaviour must stay identical.
       - haptics: keep the existing haptic(pattern, minGapMs) API in src/game/haptics.ts. On native, route it to
         @capacitor/haptics (≤15ms Light, ≤40ms Medium, longer Heavy, array patterns → notification). Keep the throttle
         and setHapticsEnabled().
       - status bar (Style.Dark), keep-awake on run start / allow sleep on pause/menu/result, @capacitor/app pause →
         the same auto-pause path as visibilitychange, resume → stay paused; resume the AudioContext on the next gesture.
  7. Safe area: check that the HUD, menus, skill tree and result overlay clear the Dynamic Island / home indicator in
     WKWebView (CSS already uses env(safe-area-inset-*)). Add -webkit-touch-callout:none and
     -webkit-tap-highlight-color:transparent if they're missing. No bounce, no zoom, no text selection.
  8. Bump .github/workflows/pages.yml node-version 20 → 22 (nothing else in that file).
  9. Verify, and paste the outputs:
       npm run build                                   (must pass; tsc strict)
       BASE_PATH=/exit-rush/ npm run build && grep -c '/exit-rush/assets' dist/index.html   (≥1)
       npm run build:native && grep -c '"/assets/' dist/index.html                                       (≥1)
       npm run test:sim                                (must print OK)
       npx cap sync ios                                (must succeed)
     If Xcode is available: build for the iOS Simulator (iPhone 17 Pro and iPhone SE 3rd gen), e.g.
       xcodebuild -project ios/App/App.xcodeproj -scheme App -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
     then run it, capture screenshots (xcrun simctl io booted screenshot) of: menu, in-run HUD (L1), skill tree,
     result overlay. Do both EN and 粵. Open and inspect every screenshot for clipping, safe-area overlap and leftover
     real-operator branding. Also check that Airplane-Mode-style offline play works (no network requests).
 10. Update docs: add a short "Native iOS (Capacitor)" section to README.md and tick the Phase 1 boxes in
     docs/APP_STORE.md. Do not rewrite other sections.

REPORT BACK WITH:
  - Branch name, list of commits, files added/changed.
  - Command outputs from step 9 (pass/fail), web bundle size before/after (dist/assets/*.js).
  - Screenshots you reviewed and anything you fixed.
  - A clear list of OWNER-ONLY steps still remaining (Apple Developer enrolment, selecting the Team in Xcode signing,
    confirming the bundle id, App Store Connect record, running on my physical iPhone, TestFlight upload, etc.) and
    anything you couldn't verify on this machine.
  - Proposed Phase 2 next steps (icon/splash via @capacitor/assets, iPhone perf tuning per §D, About/privacy screen).
```

---

## Project status snapshot (as of 2026-10-06)

| Item | Status |
|------|--------|
| Version | **0.7.0** (`package.json`): L31–99 playable (100 levels), eight boss kings (L20–90, all at L100) with entrance cutscenes, 1 SP per first clear, free respec + 3 loadouts. Repo `exit-rush` (save key `exit-rush-v1`) |
| Live web | <https://kingsleykwan.github.io/exit-rush/> (GitHub Pages, auto-deploy from `main`, Node 20, `BASE_PATH=/exit-rush/`) |
| Content | Levels **1–100** playable (~10–28 s each). 9 passenger types + 8 boss kings. L100 unlocks after L99 |
| Systems done | Pure-TS 60 Hz crowd sim + headless bot (`npm run test:sim`), constellation skill tree STR/SPD/STA with Tier-3 counters + ults, intro cards + FTUE ghost hand, side-door bays with closed-door signage, per-station themes, original Web Audio SFX + mixer, EN/粵 i18n, quality tiers + FPS probe, auto-pause lifecycle, save migration, PWA manifest + icons, 1024 store icon (`store/app-icon-1024.png`) |
| Native / App Store | **Not started.** No Capacitor, no `ios/` (and `.gitignore` currently ignores `ios/`). No Apple Developer account yet (owner) |
| Monetisation | None. Plan in `docs/APP_STORE.md` §E (recommend v1 without ads) |
| Known issues | Bot balance in band for L6–99; L100 ult-str 26 % (band 30–50 %). Not yet human-playtested past L30. **iPhone performance not yet profiled in WKWebView**: DPR 3 devices render at pixelRatio 2 on high, PCF 1024² shadows. `haptics.ts` is a no-op on iOS (needs the native plugin). `scripts/capture-*.mjs` hard-code `/workspace/...` paths and need Playwright, which isn't a dependency |


---

## v0.8.0 — Characters / IAP hooks (for local Grok Build)

- Build flag: `VITE_PLATFORM=ios` (Capacitor). Default `web` unlocks all characters with no IAP UI.
- Fail-closed: `IS_STORE_BUILD` is true on any native shell even if a web bundle loads.
- Hook points (stubs today — replace with RevenueCat / StoreKit 2):
  - `src/game/entitlements.ts` → `buy()`, `restore()`, `products()` (localized prices)
  - Product ids: `exitrush.char.mage`, `exitrush.char.tech`, `exitrush.pack.chars`, `exitrush.noads`
  - Character select Buy / Restore buttons only render when `entitlements().showStoreUi` (iOS)
- Do **not** ship the unlocked web demo path inside the App Store binary.
