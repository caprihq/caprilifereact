# CAPRI Mobile

The CAPRI client for iOS and Android, in **bare React Native 0.86.2 — no Expo**.

It talks to the same Base44 backend as the existing web client
(`capriforlifev1.base44.app`) over HTTPS, and shares no code with it. It ships under
the same bundle id as the app already on the App Store, so a release is an update to
that app rather than a new listing.

## Requirements

| | |
| --- | --- |
| Node | ≥ 20 |
| Android | Android Studio SDK (API 36) and its bundled JDK |
| iOS | full Xcode, plus Ruby and Bundler for CocoaPods |

## Setup

```sh
npm install          # also applies patches, via patch-package
bundle install       # CocoaPods, pinned by the Gemfile
npm run pods         # cd ios && bundle exec pod install
```

If `pod install` fails before it starts resolving, it is usually one of two local
issues rather than the project:

```sh
# Ruby reads the folder name as ASCII and refuses to normalise it
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8

# `xcodebuild` is unavailable because xcode-select points at CommandLineTools.
# Either switch it once, system-wide…
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
# …or point a single command at Xcode without changing your setup:
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer bundle exec pod install
```

## Running

```sh
npm start            # Metro, on port 8081
npm run android      # build, install and launch on the running emulator or device
npm run ios          # build and launch in the simulator
```

For iOS, open **`ios/CAPRI.xcworkspace`** — not the `.xcodeproj` — when working in
Xcode, and set your team under Signing & Capabilities.

Metro caches Babel transforms. After editing `babel.config.js`, restart with
`npm start -- --reset-cache`, or the change appears to do nothing.

## Checks

```sh
npm run verify       # typecheck + lint + tests, the pre-commit gate
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm test             # jest
```

## Builds

```sh
# Android APK. Gradle needs both of these on this machine; the wrapper does the rest.
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

An incremental build takes about a minute; the first one after a dependency change or
a cleared Gradle cache takes far longer, because it re-downloads Gradle itself.

For iOS, archive from Xcode (Product → Archive). There is no EAS or fastlane.

## Before shipping

- **Signing** — Apple team `6672DRVT87`, matching the shipped app. A different team
  cannot sign this bundle id.
- **Versions** — `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the Xcode project
  and `versionName` / `versionCode` in `android/app/build.gradle` are kept in step.
  An upload must outrank what is already live.
- **Firebase is optional and currently absent.** With no `GoogleService-Info.plist`
  or `google-services.json`, Crashlytics and push are inert and both platforms build
  anyway. Add the files to turn them on; nothing else needs changing.
- **The bundle id is the production one.** Installing a build replaces the existing
  CAPRI app on that device, and an upload goes to the same App Store Connect record.

## Backend

`../capri-for-life/base44/` holds the entities, functions and connectors both clients
call. Backend changes belong there — Base44 syncs from that repository, and a second
copy would drift. This app reaches it purely over HTTPS through `@base44/sdk`;
nothing is imported across the two directories.
