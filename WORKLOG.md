# CAPRI Mobile — Work Log

Running record of the React Native migration. **Append to this file as work
happens; read it before starting a session.** It is the memory between
sessions — the conversation is not.

Rules that govern every entry here: [CODING_GUIDELINES.md](./CODING_GUIDELINES.md).

---

## Project location

This is a **standalone project** at `~/workspace/CAPRI-FOR-LIFE(React Native)/`,
a sibling of `~/workspace/capri-for-life/` (web client + Base44 backend).
It was moved out of `capri-for-life/mobile/` on 2026-08-12.

Consequences:

- **Not under version control.** Moving it out of `capri-for-life/` left that
  git repository behind, and no new one has been initialised — no git
  operations are run on your behalf. Until `git init`, this code has no
  history and no backup.
- The backend still lives at `../capri-for-life/base44/`. Reached over HTTPS
  via `@base44/sdk`; nothing is imported across the directories.
- The path contains parentheses and a space. Verified working: tsc, eslint,
  jest, `react-native bundle`, and CocoaPods Podfile evaluation with all 17
  native modules linked at correct absolute paths. **Not yet verified:** the
  actual `pod install` and Xcode build phases, which run shell scripts and are
  the usual place unquoted paths break.

## Standing constraints

1. **No git operations, ever.** No commit, push, tag, merge, branch. Work is
   left uncommitted in the working tree for the user to review.
2. **Never modify the web project.** `../capri-for-life/` — its `web/`,
   `base44/` and root configs — belongs to the app currently serving App Store
   users. Backend changes are a deliberate, separate task there.
3. Latest React Native, TypeScript strict, functional style, component-based,
   custom design system — enforced by `eslint.config.js`, not by good
   intentions.

---

## Verified facts (do not re-derive)

| Fact | How it was confirmed |
| --- | --- |
| Base44 app id = `69aa4c4d4f33993320ae7f08` | Derived from bundle id `com.base<24hex>.app`; the public-settings endpoint echoed it back in `extra_data.app_id` |
| Base44 app base URL = `https://capriforlifev1.base44.app` | `web/capacitor.config.ts`, `CapriWidget.swift` |
| **`@base44/sdk` works with no DOM** | Loaded in Node with `window`/`document`/`localStorage`/`sessionStorage` absent; client constructed; `auth.me()` made a real request → 403 without a token |
| OAuth endpoints respond | `/api/apps/auth/login` and `/api/apps/auth/apple/login` → 307 to `app.base44.com`, `from_url` preserved |
| Email auth is a real API | SDK exposes `loginViaEmailPassword`, `register`, `verifyOtp`, `resendOtp`, `resetPassword*` — no browser needed |
| **No native Apple/Google token exchange exists** | Base44 has no endpoint accepting a pre-obtained identity token. `loginWithProvider()` only starts a redirect flow → ASWebAuthenticationSession is the only viable path |
| Expo SDK 57 pins RN **0.86.2** | `bundledNativeModules.json` — latest stable, so no Expo-vs-latest tradeoff |
| Metro bundles the app | `expo export --platform ios` → 1545 modules, Hermes bytecode built |

### Library API gotchas already hit

- `react-native-mmkv` **v4**: `MMKV` is a *type*; construct with `createMMKV()`.
  `delete()` was renamed `remove()`.
- `@react-native-firebase` **v26**: modular API — `getCrashlytics()` plus free
  functions. The `crashlytics().log()` namespaced style is gone.
- Base44 `register()` takes **no name field** (`{email, password,
  turnstile_token?, referral_code?}`). `verifyOtp()` takes an **object**
  `{email, otpCode}`.
- `base44.auth.setToken(token, false)` — pass `false`, or the SDK tries to
  persist to web storage that does not exist here.
- `eslint-plugin-react` does not support ESLint 10 yet → pinned to ESLint 9.
- RN 0.86.2 requires `react@^19.2.3` (19.2.0 fails peer resolution).

---

## Session 2026-08-11 (a) — foundation

Built the app skeleton and auth architecture.

- Scaffolded Expo SDK 57 / RN 0.86.2 / React 19.2.8, TypeScript strict.
- `eslint.config.js` encodes the guidelines as rules: no classes, 200-line file
  cap, 80-line function cap, no empty catch, no `console.log`.
- `src/lib/` — Base44 adapter, Keychain (`expo-secure-store`) + MMKV stores,
  pure JWT/session logic with 16 passing tests.
- `src/features/auth/` — email/OTP forms, OAuth via ASWebAuthenticationSession,
  session state machine, silent restore.
- `src/navigation/` — native stack + bottom tabs.
- Crashlytics wrapper + error boundary.

**Gates:** typecheck ✅ · lint ✅ · tests 16/16 ✅ · Metro bundle ✅

### Honest gap assessment that triggered session (b)

The code compiled but **had never been run**. Worse, a parity review found the
Capacitor shell attached **five** `window.Capri*` bridges and the RN shell
attached **zero**. The web code degrades silently when they are missing, so
nothing crashes — features just stop working:

| Bridge | Consequence when absent |
| --- | --- |
| `CapriIAP` | **Subscriptions dead.** Throws "only available in the CAPRI iOS app" — no one can upgrade |
| `CapriVoice` | **Voice capture dead.** Falls back to Web Speech, which does not work in WKWebView |
| `CapriPush` | Push registration silently returns false |
| `CapriWidget` | Home-screen widget stops receiving a token |
| `CapriAuth` | Not needed — RN owns auth now |

Plus: the web `Layout.jsx` renders its own `fixed bottom-0` nav *inside* the
WebView (double tab bars), and the native Profile stub dropped ~12 settings the
web Profile has.

---

## Session 2026-08-11 (b) — functional parity

Goal: the RN shell must provide everything the Capacitor shell did, so the
embedded web app behaves exactly as it does in production today.

- [x] WebView bridge infrastructure (injected JS ↔ `postMessage` RPC)
- [x] `CapriIAP` — RevenueCat (`react-native-purchases` 10.7.0)
- [x] `CapriPush` — APNs token (`expo-notifications` 57.0.10)
- [x] `CapriVoice` — speech recognition (`@react-native-voice/voice` 3.2.4)
- [~] `CapriWidget` — JS contract done, native App Group write pending
- [x] Profile tab → WebView (restores all settings)
- [x] Hide the web bottom nav inside the WebView (injected CSS)
- [x] Rename `src/app/` → `src/bootstrap/`
- [x] **Extra:** intercept web-login redirects → native login

### How the bridge works

RN's WebView is a separate JS context, so the Capacitor approach (attach
plugins directly to `window`) is impossible. Instead:

```
page                            native
────                            ──────
window.CapriIAP.purchase(id)
  └─ postMessage {id, bridge, method, args}
                             →  useBridgeHandler routes to iapBridge
                             ←  injectJavaScript(__capriSettle(id, ok, value))
  └─ promise resolves
```

Voice needs the reverse direction too: `start()` keeps its callbacks page-side
(functions cannot be serialised) and native pushes partials through
`__capriEvent('voice:result', …)`.

**Method parity verified** — all 8 methods the web app actually calls are
routed, plus `CapriVoice.isSupported`:

```
web calls:  CapriIAP.{setUser,purchase,restore}  CapriPush.getToken
            CapriVoice.{start,stop}  CapriWidget.{setAuth,clearAuth}
routed:     all of the above  +  CapriVoice.isSupported
```

`window.CapriAuth` is deliberately **not** provided — the native shell owns
auth. That created an edge case: with it absent, an expired session makes the
web AuthContext call `redirectToLogin`, which would render a web login form
inside the tab. `onShouldStartLoadWithRequest` now intercepts `/login` and
`/api/apps/auth` and hands off to the native login instead.

### Files added in (b)

```
src/features/webview/
├── bridge/
│   ├── protocol.ts          message shapes + injection helpers
│   ├── injectedBridge.ts    recreates window.Capri* inside the page
│   ├── useBridgeHandler.ts  routes calls → native, settles promises
│   ├── iapBridge.ts         RevenueCat
│   ├── pushBridge.ts        APNs token
│   ├── voiceBridge.ts       speech recognition + error-code mapping
│   └── widgetBridge.ts      App Group (partial — see below)
├── components/AuthenticatedWebView.tsx
├── hooks/useSessionToken.ts
└── screens/WebAppScreen.tsx
```

### ⚠️ The one genuine gap: home-screen widget

`widgetBridge.ts` has the complete JS contract but cannot write yet. Two
native pieces are missing, neither producible from JavaScript:

1. **The WidgetKit extension target.** `expo prebuild` does not generate app
   extensions. Needs a config plugin (e.g. `@bacons/apple-targets`) or manual
   Xcode work. The SwiftUI source at `web/ios/App/CapriWidget/` ports over
   nearly verbatim once the target exists.
2. **A native module to write App Group UserDefaults**
   (`group.com.base69aa4c4d4f33993320ae7f08.app`, key `capri_widget_token`).

`registerAppGroupWriter()` is the single injection point — adding the module
later is a one-line change. Until then the calls resolve and no-op, which is
the safe failure: nothing downstream breaks, the widget just keeps its last
content.

### Constants carried over from the Capacitor shell

- RevenueCat iOS public key `appl_UhKHaCHdhTOZrpGwOUvpIHHhGYE`
- Entitlement `capri_executive` → plan `executive`, else `free`
- App Group `group.com.base69aa4c4d4f33993320ae7f08.app`, key `capri_widget_token`
- Voice error codes `permission_denied` / `no_speech` / `interrupted` /
  `audio_reset` — matched so the web component's existing messages still work

### Bridge contracts that must be matched exactly

Read off `web/src/lib/capacitorBridge.js`; the web app calls these verbatim.

```js
window.CapriIAP = {
  setUser(userId): Promise<void>,
  purchase(productId): Promise<{ success: true, plan: 'executive'|'free' }>,  // throws on unknown product
  restore(): Promise<{ success: true, plan }>,
}
window.CapriPush   = { getToken(): Promise<string|null> }   // null if permission denied
window.CapriWidget = { setAuth({ token }): Promise<void>, clearAuth(): Promise<void> }
window.CapriVoice  = {
  isSupported(): Promise<boolean>,
  start({ lang, onResult(text, isFinal), onError(code), onEnd() }): Promise<void>,
  stop(): Promise<void>,
}
```

Constants carried over from the Capacitor shell:
- RevenueCat iOS public key `appl_UhKHaCHdhTOZrpGwOUvpIHHhGYE` (designed to be embedded)
- Entitlement id `capri_executive` → plan `executive`, else `free`
- App Group `group.com.base69aa4c4d4f33993320ae7f08.app`, token key `capri_widget_token`

---

---

## Session 2026-08-11 (c) — closing the remaining gaps

Everything not blocked on Firebase/Apple credentials.

- [x] **Theme parity.** Native chrome was light/dark only while the web app has
      five accents, so picking "rose" turned the page rose and left the tab bar
      blue. Native now builds themes on two axes (accent × mode) using the same
      hex values as `web/src/components/useTheme.jsx`, and the injected script
      mirrors the user's choice out of `localStorage`. Same-page writes are
      caught by patching `localStorage.setItem` — the `storage` event only
      fires for *other* tabs, never the one writing.
- [x] **Real tab icons.** Ionicons filled/outline pairs (ships with Expo)
      replace the placeholder squares.
- [x] **App Group native module** — `modules/capri-app-group/`, an Expo module
      exposing `setItem`/`removeItem`/`getItem`/`isAvailable` over
      `UserDefaults(suiteName:)` plus `WidgetCenter.reloadAllTimelines()`.
      Replaces `CapriWidgetPlugin.swift`. Entitlement declared in
      `app.config.ts`.
- [x] **Bridge protocol tests** — 17 new cases covering malformed input,
      unknown bridge names, non-bridge traffic passing through untouched, and
      script-escaping (a quote in an error message must not break out of the
      injected statement). Total now **33**.
- [x] **Voice permission strings + background mode** carried into
      `app.config.ts` with the same wording as the Capacitor `Info.plist`.
- [x] **Splash** — colour-only, matched to the app background in both schemes
      so launch does not flash. Configured through the `expo-splash-screen`
      plugin (top-level `splash` was removed from `ExpoConfig` in SDK 57).

- [x] **Firebase made optional.** `googleServicesFile` pointing at a missing
      file made the whole Expo config unparseable, which blocked `expo
      prebuild` outright. `app.config.ts` now gates the plist, both Firebase
      plugins and `useFrameworks: 'static'` on `existsSync()`. The app builds
      and runs on a simulator today; dropping the plist into `mobile/` turns
      Crashlytics on with no code change.

### Duplication audit (2026-08-11)

Swept for hardcoded colours and repeated literals. Result: **RN 0.86.2 is
current** (npm latest = Expo SDK 57 pin = installed), and only two categories
of repetition existed.

- Fixed: 8 magic numbers in styles → `SCREEN_PADDING`, `controlHeight`,
  `letterSpacing` tokens. Components now contain zero raw style values.
- Fixed: App Group id / widget key were in three files → single source in
  `modules/capri-app-group/constants.ts`.

**Trap worth remembering:** `app.config.ts` **cannot import from `src/` or
`modules/`.** Expo transpiles that file to `app.config.js` and `require`s it,
but does not transpile its imports — so `import { X } from './src/...'` fails
with `Cannot find module` and the entire config becomes unreadable. I hit this
by trying to de-duplicate, and reverted.

The three unavoidable duplicates (TS constant, Swift module, `app.config.ts`)
are now guarded by `src/config/configConstants.test.ts`, which reads the other
files as text and fails on drift. Cheaper than a build-time codegen step, and
it catches the failure that is otherwise invisible — a mismatched App Group id
silently stops the widget receiving its token.

### Local toolchain check (2026-08-11)

```
Node        v24.14.1     ✅ matches .nvmrc
CocoaPods   installed    ⚠️ warns unless LANG=en_US.UTF-8
Xcode       ❌ NOT INSTALLED — only /Library/Developer/CommandLineTools
Simulators  ❌ none available
Watchman    ❌ not installed (optional)
```

Full Xcode is required before any simulator run. See README → "Running on a
simulator".

### Gates after session (b)

```
typecheck  ✅ clean (strict + exactOptionalPropertyTypes)
lint       ✅ clean
tests      ✅ 16/16
bundle     ✅ 1642 modules (was 1545 — the four native modules bundle fine)
isolation  ✅ nothing outside mobile/ touched; nothing committed
```

Lint caught three real defects in `voiceBridge.ts` during this session:
an unbound `Voice.removeAllListeners` (would lose `this`), `String()` on an
`unknown` (would stringify to `[object Object]`), and a complexity breach.
All fixed rather than suppressed.

---

---

## Session 2026-08-11 (d) — SCOPE CHANGE: fully standalone app

**New requirement: the RN app must share nothing with the web app and must
implement every feature and screen natively.** The WebView is no longer an
acceptable interim — it must be deleted once the screens exist.

This is roughly **10,000 lines across 25+ screens and sheets**, so it runs
across several sessions. Order below is by dependency, not by visibility.

### Phase 1a — design system ✅

The user's critique was correct and measurable: 2 shared components, 12 inline
`fontSize: theme.fontSize…` blocks, 8 repeats of the screen scaffold, and
`StatusView.tsx` holding two components in breach of §3.1.

Root cause worth remembering: **tokens are not a design system.** Tailwind gave
the web client a composition layer for free (`className="text-lg font-bold"`);
removing it and adding only tokens left every screen hand-assembling style
objects. An earlier audit missed this because it grepped for numeric literals,
not for repeated *token references*.

```
src/components/
├── Text.tsx        variant × tone — replaces 12 inline blocks
├── Screen.tsx      safe area + background + gutter — replaces 8
├── Card.tsx        rounded surface, optional press
├── Row.tsx         iOS settings row (the web Profile repeats this ~12×)
├── Button.tsx      primary | secondary | ghost
├── LoadingView.tsx ┐ split out of StatusView,
├── ErrorView.tsx   ┘ one component per file
└── EmptyState.tsx
```

### Phase 1b — pure logic ported ✅

Rewritten natively in `src/lib/`, not imported from `web/`:

| Module | Notes |
| --- | --- |
| `scoring/capriScoring.ts` | Now **pure** — the web version read `localStorage` *inside the sort comparator* (O(N log N) storage reads, untestable). Signals are injected. Also non-mutating; the original `sort()`/`splice()`d the caller's array. |
| `scoring/taskReason.ts` | Copy variants as a flat ordered rule table instead of nested ifs |
| `planner/plannerLogic.ts` | Timezone + clock injected; the unconditional per-task production logging is gone |

**Tests: 88 total** (was 41). The scoring engine — the product's core IP — had
**zero** tests on the web side because its storage reads made it untestable.
Purity fixed that: 28 tests now cover the formula, the critical rule,
behavioural boosts, reason stability, and non-mutation; 22 cover the planner's
timezone edge cases including the late-evening bug the local-date rule exists
to prevent.

### Phase 1c — native services extracted ✅

Moved out of `features/webview/bridge/` into `src/lib/native/` (`iap`, `push`,
`voice`, `widget`). They are now plain services the native screens will call
directly; the WebView bridge simply delegates to them. Nothing has to be
rewritten when the WebView is deleted — only the delegation layer disappears.

### Phase 1d — data layer ✅

| Module | Purpose |
| --- | --- |
| `lib/base44/entities.ts` | Typed entity accessors. The SDK exposes `entities` as a name→module index so every property is `T \| undefined`; this resolves once and **throws loudly** if an entity is missing. That is exactly the failure mode that let the web client's `FocusTime` bug hide silently. |
| `features/tasks/api/taskKeys.ts` | Query-key factory — the web client hand-wrote `["tasks", email]` in a dozen places |
| `taskQueries.ts` | `useCurrentUser`, `useTasks`, `useCommitments`, `useCalendarEvents` |
| `useTaskCrud.ts` | Optimistic create/update/delete with rollback |
| `useTaskMutations.ts` | complete / defer / cancel with undo, built on the CRUD layer |
| `lib/plan/plans.ts` + `usePlan.ts` | Tier + feature gating, free-tier caps |
| `lib/scoring/signalsStore.ts` | Behavioural signals: reads storage **once**, feeds the pure scorer |

**Tests: 105** (was 88). New coverage on plan gating — including a regression
guard for the `analytics` omission that once handed every free user unlimited
AI — and on the signals store's 24h expiry, 3-skip threshold, and the 30%
favoured-category rule.

Design note: mutations emit a `MutationFeedback` object instead of rendering a
toast. The web version returned JSX from the hook, which made it untestable
and tied it to one toast library.

### Phase 2 — native Home ✅ (built, not yet routed)

`NativeHomeScreen` renders the full Home experience from native components:
greeting header, "Start Here" hero, "Up Next", "Today's Plan", swipe actions
with undo.

**Deliberately NOT wired into the tab bar yet.** Add and edit arrive in Phase
3, and switching now would be a regression against the WebView, which has
both. Swap `AppNavigator`'s Home screen to `NativeHomeScreen` once the sheets
land.

```
features/tasks/
├── api/            taskKeys · taskQueries · useTaskCrud · useTaskMutations
├── hooks/          useTaskFeed  (data + scoring + planner in one derivation)
├── components/     HeroCard · UpNextCard · TodayPlanCard · SwipeableTaskRow
│                   TaskMeta · HomeHeader · HomeSections · SectionLabel
└── screens/        NativeHomeScreen
```

Plus `components/FeedbackProvider.tsx` — the toast the mutation hooks emit
into, and `lib/time/useNow.ts`.

**Tests: 111.**

#### Two things worth remembering

**`Date.now()` cannot be called during render.** React's purity rule flagged
it inside `useTaskFeed`'s `useMemo`: the value changes on every re-render, so
memoised work silently recomputes and two components can disagree about "now"
mid-pass. `useNow()` holds it in state, ticking each minute and on
foreground — which also means "Due today" flips to "Needs attention" at
midnight without a relaunch.

**Reanimated conflicts with `react-hooks/immutability`.** Assigning to
`sharedValue.value` is Reanimated's public API and happens inside worklets on
the UI thread, not during render, but the rule cannot tell the difference.
Disabled file-locally in `SwipeableTaskRow` with that reasoning recorded. This
is the only rule suppression in the codebase.

### Phase 3 — capture & edit ✅ · **Home is now native**

The Home tab no longer renders the WebView. `AppNavigator` is a native stack
wrapping the tabs, with AddTask and TaskDetail pushed as
`presentation: 'formSheet'` — a real UIKit sheet with system grabber and
drag-to-dismiss, so **no bottom-sheet library was needed**.

| Added | Notes |
| --- | --- |
| `AddTaskScreen` | Two-step capture: one text box, then confirm-and-correct |
| `TaskDetailScreen` | Edit, complete, delete; reads the cached list so opening is instant |
| `TaskFieldsForm` | Shared by both — title, due date, duration, category, priority |
| `DueDateRow` | Platform date picker, inline on iOS |
| `Picker`, `TextField` | Promoted to shared `components/` |
| `AddTaskButton` | Floating action button clear of the tab bar |
| `lib/tasks/parseTaskInput.ts` | Keyword parser — **pure, no SDK import** |
| `features/tasks/api/aiTaskParser.ts` | LLM parse for paid users, falls back to the heuristic |
| `lib/tasks/toTaskPatch.ts` | Strips undefined before sending |

**Tests: 119.**

#### Notes worth keeping

**Capture degrades, never fails.** Paid users get an LLM pass that reads dates,
durations, category and priority out of a sentence; free users get keyword
heuristics; and the AI path falls back to those heuristics on any error.
Losing the metadata is always better than losing the task.

**The parser had to be split to be testable.** Importing it pulled in
`@base44/sdk`, whose nested `uuid` ships ESM and broke Jest. Rather than mock
around it, the pure parser moved to `lib/tasks/` with no SDK import — which is
what §3.4 asked for anyway. `transformIgnorePatterns` was also widened to
reach nested `node_modules/uuid` for any future SDK-touching test.

**`toTaskPatch` omits undefined rather than sending it.** Base44 stores what it
is given, so `due_date: undefined` would at best be meaningless and at worst
clear a value the user never touched. It also satisfies
`exactOptionalPropertyTypes`.

### Phases 4 & 5 ✅ — **the WebView is gone**

`src/features/webview/` is deleted and `react-native-webview` is uninstalled.
The app no longer loads anything from the web client; every screen is native.

**Phase 4 — Profile and settings**

| Screen | Covers |
| --- | --- |
| `ProfileScreen` | identity + inline rename, plan, preferences, appearance, notifications, help, admin, sign out |
| `PreferencesSection` | work hours, preferred task length, context-switch tolerance — the inputs the auto-scheduler and LLM prompts actually read |
| `AppearanceSection` | all five accents + dark mode |
| `PlanScreen` | RevenueCat purchase and restore, same product ids and `capri_executive` entitlement |
| `SupportScreen` | posts to `sendSupportEmail` |
| `PrivacyScreen` | reachable without an account, as Apple requires |
| `AdminScreen` | push console, admin-gated (server re-checks) |

**Phase 5 — remaining features**

| Added | Notes |
| --- | --- |
| `PlannerScreen` + `PlannerGroup` | Today / Needs attention / Carryover, grouped by the tested planner rules |
| `useAutoSchedule` | calls `autoScheduleTasks`; backend enforces the plan gate |
| `useVoiceCapture` + `VoiceButton` | native speech recognition, free tier capped at 1/day |
| `TaskCaptureStep` | extracted capture step |

Sign-out now calls `clearSignals()` so the next account does not inherit the
previous user's ranking history.

**Tests: 102.** Down from 119 because the 17 WebView-bridge protocol tests
were deleted with the code they covered — the remaining count is all live.

#### Purity rules caught three more real bugs

React 19's compiler-adjacent lint keeps earning its place:

- `Date.now()` during render in `useVoiceCapture` — now `useNow()`, which also
  means the daily voice cap resets at midnight without a relaunch.
- Writing `onTranscriptRef.current = …` during render — moved into an effect.
- Two screens past the 80-line cap, split into `TaskCaptureStep` and
  `ProfileSettingsList`.

#### Naming cleanup

`applyWebTheme` → `applyTheme`. With no web app left, the old name lied.

### Remaining phases
- [ ] **2** task screens: Home, hero card, Up Next, all-tasks list, daily planner
- [ ] **3** sheets: AddTask (3-step wizard), TaskDetail, AutoSchedule, Subtasks, Voice
- [ ] **4** Profile + 12 settings sections, plan management, onboarding, admin, privacy
- [ ] **5** delete `src/features/webview/`, full verification

---

## Session 2026-08-12 — Expo removed, pure React Native

**Requirement change: no Expo. Bare React Native 0.86.2 only.**

The native project was regenerated from the `@react-native-community/cli`
0.86.2 template and renamed `CapriRN` → `CAPRI`. `ios/` is now a permanent,
hand-editable Xcode project rather than something `prebuild` regenerates.

### Replacements

| Expo | Bare React Native |
| --- | --- |
| `expo` / `registerRootComponent` | `AppRegistry.registerComponent` (`index.js`) |
| `expo-constants` (`extra`) | plain constants in `lib/base44/config.ts` |
| `expo-secure-store` | `react-native-keychain` |
| `expo-web-browser` (`openAuthSessionAsync`) | `react-native-inappbrowser-reborn` (`openAuth` → ASWebAuthenticationSession) |
| `expo-notifications` + `expo-device` | `@react-native-firebase/messaging` + `react-native-device-info` |
| `expo-splash-screen` | `react-native-bootsplash` |
| `expo-status-bar` | RN `StatusBar` |
| `@expo/vector-icons` | `react-native-vector-icons` |
| `jest-expo` | `@react-native/jest-preset` |
| `babel-preset-expo` | `@react-native/babel-preset` |
| `expo/metro-config` | `@react-native/metro-config` |
| Expo local module (`expo-modules-core`) | plain `RCT_EXTERN_MODULE` Swift + ObjC bridge |
| `app.config.ts` | `Info.plist` + `CAPRI.entitlements` |
| `eas.json` | Xcode / fastlane (not yet configured) |

### Four traps worth remembering

**`extends: "@react-native/typescript-config/tsconfig.json"` does not
resolve** — the package restricts subpath exports. The base is now inlined in
`tsconfig.json`, which is more auditable anyway.

**Metro reads `@/…` as a package scope, not an alias.** Expo's babel preset
resolved tsconfig `paths` for us; bare RN does not. `extraNodeModules` does
*not* fix it either — the fix is `babel-plugin-module-resolver`. And Metro
caches transforms, so the config change only took effect after
`--reset-cache`: the first two attempts failed misleadingly.

**`@react-native-firebase/messaging` v26 is modular too** — `getMessaging()`
plus free functions, same as crashlytics. The `messaging().x()` style is gone.

**`Ionicons.ttf` must be listed under `UIAppFonts`** or every glyph in the app
renders blank, with no error.

### Native config now lives in the plist

`Info.plist` carries the `capri://` URL scheme, microphone and speech
permission strings, `remote-notification` background mode, and the icon font.
`CAPRI.entitlements` carries the App Group and `aps-environment`.

`src/config/configConstants.test.ts` was rewritten to read those files instead
of `app.config.ts`, so the drift guard still covers the App Group id, the
OAuth scheme, the Base44 app id and the icon font registration.

**Gates:** typecheck ✅ · lint ✅ · tests ✅ **106** · bundle ✅ 3.5 MB via
`react-native bundle`.

## Still blocked on the user

| Item | Blocks |
| --- | --- |
| `GoogleService-Info.plist` | Crashlytics + `expo prebuild` (currently fails on the missing file) |
| App Store Connect app id + Apple Team id | `eas.json` → submit |
| A physical device run | Every ⚠️ in the acceptance table below |

## Acceptance criteria status

| Criterion | State |
| --- | --- |
| TestFlight build provided | ❌ blocked on plist + Apple creds |
| Apple / Google / email auth reliable | ⚠️ written, never executed |
| Sessions persist across restarts | ⚠️ written, never executed |
| Existing accounts + Base44 data load | ⚠️ written, never executed |
| Navigation works | ⚠️ written; double-nav defect being fixed in (b) |
| Crashlytics active | ❌ blocked on plist |

Nothing moves from ⚠️ to ✅ without a device run of the 16-scenario matrix in
[README.md](./README.md).
