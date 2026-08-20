# CAPRI Mobile

Standalone iOS client for CAPRI, in **pure React Native 0.86.2 — no Expo**.

A separate project, sitting alongside the web app rather than inside it:

```
~/workspace/
├── capri-for-life/                 web client + Base44 backend
│   ├── base44/                       entities, functions, connectors
│   ├── web/                          Vite + Capacitor client
│   └── public-site/
└── CAPRI-FOR-LIFE(React Native)/   ← this project
```

It shares **no code** with the web client. Every screen, and the scoring
engine behind them, is implemented natively here. The only thing the two
clients share is the Base44 backend — reached over HTTPS, not by import.

- Coding standards: [CODING_GUIDELINES.md](./CODING_GUIDELINES.md)
- Decision history and traps already hit: [WORKLOG.md](./WORKLOG.md)

## Layout

```
mobile/
├── ios/                    Xcode project (permanent, hand-editable)
│   └── CAPRI/
│       ├── Info.plist          URL scheme, permissions, UIAppFonts
│       ├── CAPRI.entitlements  App Group, aps-environment
│       └── AppGroup/           native module for the widget token
├── modules/capri-app-group/    its TypeScript side
└── src/
    ├── bootstrap/          App root + error boundary
    ├── components/         design-system primitives
    ├── design/             tokens + theme
    ├── features/           auth · tasks · profile · admin
    ├── lib/                pure logic — no React, no RN imports
    ├── navigation/
    └── types/
```

## Running it

Full Xcode is required.

```sh
# one-time, if xcode-select still points at CommandLineTools
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept

cd mobile
npm install
npm run verify        # typecheck + lint + tests
bundle install        # CocoaPods, via the Gemfile
npm run pods          # cd ios && bundle exec pod install
npm run ios           # react-native run-ios
```

Metro caches babel transforms. After changing `babel.config.js`, start with
`npm start -- --reset-cache` — otherwise the change appears to have no effect.

### Supply before the first build

| Item | Where |
| --- | --- |
| `GoogleService-Info.plist` (Firebase) | `ios/CAPRI/`, added to the Xcode target |
| Apple Team + signing | Xcode → Signing & Capabilities |
| App Group capability | Xcode → Signing & Capabilities, app target |

### TestFlight

Archive from Xcode (Product → Archive), or wire up fastlane. There is no EAS.

⚠️ The bundle id is the **production** one, shared with the Capacitor app.
Installing this build replaces the existing CAPRI app on that device, and an
upload goes to the same App Store Connect record.

## Verified against the live backend

Checked before the code was written, not assumed:

- **App id `69aa4c4d4f33993320ae7f08`** — derived from the bundle id and
  confirmed: the public-settings endpoint echoes it back in
  `extra_data.app_id`.
- **`@base44/sdk` works with no DOM** — loaded with `window`, `document`,
  `localStorage` and `sessionStorage` all absent; the client constructed and
  `auth.me()` made a real request (403 without a token, as expected).
- **OAuth endpoints respond** — `/api/apps/auth/login` and
  `/api/apps/auth/apple/login` both 307 to `app.base44.com` with `from_url`
  preserved.
- **No native Apple/Google token exchange exists.** Base44 has no endpoint
  accepting a pre-obtained identity token, so sign-in runs through
  ASWebAuthenticationSession rather than the native Apple button.

## Manual test matrix

Run on a real device — the Keychain, ASWebAuthenticationSession, push and
in-app purchase all behave differently in the simulator.

| # | Scenario | Expected |
| --- | --- | --- |
| 1 | Cold launch, no session | Splash → Login, no flash of Home |
| 2 | Cold launch, valid session | Splash → Home, no login shown |
| 3 | Force-quit and relaunch | Still signed in (Keychain restore) |
| 4 | Sign in with Apple | Sheet → Home, existing CAPRI data loads |
| 5 | Sign in with Google | Sheet → Home |
| 6 | Email + password | Native form → Home |
| 7 | Unverified email | OTP screen → verify → Home |
| 8 | Cancel the OAuth sheet | Back to Login, buttons live, no spinner trap |
| 9 | Wrong password | Inline error |
| 10 | Airplane mode at launch with a session | Error screen with working Retry |
| 11 | Re-enable network → Retry | Recovers to Home |
| 12 | Add a task by typing | Appears immediately (optimistic) |
| 13 | Add a task by voice | Transcript fills the field; free tier capped at 1/day |
| 14 | Swipe a task left | Later / Cancel revealed, undo toast works |
| 15 | Open a task, edit, save | Change persists |
| 16 | Delete a task | Confirm dialog, then removed |
| 17 | Planner → Smart Auto-Schedule | Paid: schedules. Free: upgrade message |
| 18 | Profile → change accent + dark mode | Whole app updates, survives relaunch |
| 19 | Profile → work hours, task length | Persist to the backend |
| 20 | Upgrade / restore purchases | RevenueCat sheet; plan updates |
| 21 | Tab switch Home ↔ Profile | State preserved |
| 22 | Back swipe on a pushed screen | Native interactive pop |
| 23 | Sign out | Returns to Login; relaunch stays signed out |
| 24 | Forced test crash | Appears in the Crashlytics console |

3 covers "sessions persist across restarts"; 4–7 cover the three sign-ins;
10–11 the retry states.

## The backend lives in the other project

`../capri-for-life/base44/` holds the entities, functions and connectors both
clients call. Backend changes belong there, not here — Base44 syncs from that
repository, and a second copy would drift.

This app reaches it purely over HTTPS via `@base44/sdk`; nothing is imported
across the two directories.

## ⚠️ This project is not under version control

Moving it out of `capri-for-life/` took it out of that git repository, and no
new one has been initialised here — no git operations are run on your behalf.
Until you run `git init` (and add a remote), **this code exists only on this
machine with no history and no backup.**

A `.gitignore` is already in place for when you do.
