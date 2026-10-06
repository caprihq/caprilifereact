import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  APP_GROUP_ID,
  LEGACY_WIDGET_TOKEN_KEY,
  WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_MAX_AGE_HOURS,
  WIDGET_PUSH_PAYLOAD_KEY,
  WIDGET_SNAPSHOT_SCHEMA,
} from '../../modules/capri-app-group/constants'
import { KEYCHAIN_ACCESS_GROUP, SECRET_KEYS, keychainServiceFor } from '@/services/storage'
import { base44Config } from '@/config'
import { HOME_LINK_PATH, TASK_LINK_PATH } from '../../modules/capri-deep-link/constants'
import { palette } from '@/theme/tokens'

/**
 * Drift guard for values duplicated across languages and file formats.
 *
 * Under bare React Native the native configuration lives in Info.plist,
 * the entitlements file and Swift — none of which can import a TypeScript
 * constant. These tests read those files as text and fail if a value drifts.
 *
 * A mismatched App Group id silently stops the widget receiving its token;
 * a mismatched URL scheme silently breaks OAuth. Both are invisible until a
 * user reports them.
 */

const root = join(__dirname, '..', '..')
const read = (relative: string) => readFileSync(join(root, relative), 'utf8')

const infoPlist = () => read('ios/CAPRI/Info.plist')
const entitlements = () => read('ios/CAPRI/CAPRI.entitlements')
const appGroupSwift = () => read('ios/CAPRI/AppGroup/CapriAppGroup.swift')
const widgetSwift = () => read('ios/CapriWidget/CapriWidget.swift')
const appDelegate = () => read('ios/CAPRI/AppDelegate.swift')
const linkingConfig = () => read('src/navigation/linking.ts')
const widgetEntitlements = () => read('ios/CapriWidget/CapriWidget.entitlements')

describe('App Group identifiers stay in sync', () => {
  it('the entitlements file grants the same App Group', () => {
    expect(entitlements()).toContain(APP_GROUP_ID)
  })

  it('the Swift module uses the same App Group id', () => {
    expect(appGroupSwift()).toContain(APP_GROUP_ID)
  })

  it('matches the id the existing widget reads (do not change casually)', () => {
    // Changing this orphans every already-installed widget.
    expect(APP_GROUP_ID).toBe('group.com.base69aa4c4d4f33993320ae7f08.app')
  })

  it('keeps the session token out of App Group storage', () => {
    // UserDefaults is unencrypted and lands in backups. The token used to be
    // written here for the widget — that was the only plaintext copy in the app.
    expect(appGroupSwift()).not.toContain('capri_widget_token')
    expect(appGroupSwift()).not.toMatch(/session token into App Group/)
  })
})

describe('the Keychain group shared with the widget', () => {
  it('the entitlements file grants exactly the group TS names', () => {
    // Xcode expands $(AppIdentifierPrefix) at build time; JS cannot know the
    // team prefix, which is why nothing passes accessGroup at runtime.
    expect(entitlements()).toContain(`$(AppIdentifierPrefix)${KEYCHAIN_ACCESS_GROUP}`)
  })

  it('lists exactly one keychain group, because iOS uses the first one', () => {
    // With no kSecAttrAccessGroup passed, items land in the FIRST group listed.
    // A second entry would silently decide where the token lives.
    const groups = entitlements().split('keychain-access-groups')[1] ?? ''
    const upToArrayEnd = groups.slice(0, groups.indexOf('</array>'))
    expect(upToArrayEnd.match(/<string>/g) ?? []).toHaveLength(1)
  })

  it('names the service the widget must query for', () => {
    // The widget reads this item with SecItemCopyMatching; a rename here without
    // a matching change there leaves the widget permanently signed out.
    expect(keychainServiceFor(SECRET_KEYS.accessToken)).toBe('com.capri.capri.auth.accessToken')
  })
})

describe('provider sign-in callback wiring', () => {
  /**
   * Google and Apple return through `capri://auth`, so both platforms must
   * register the scheme. A drift here breaks provider sign-in silently: the sheet
   * opens, the user authenticates, and the redirect goes nowhere.
   *
   * Email sign-in is unaffected — that is a direct API call with no callback.
   */
  it('iOS registers the scheme the auth session waits on', () => {
    expect(infoPlist()).toContain(`<string>${base44Config.authCallbackScheme}</string>`)
  })

  it('Android registers the same scheme', () => {
    expect(read('android/app/src/main/AndroidManifest.xml')).toContain(
      `android:scheme="${base44Config.authCallbackScheme}"`,
    )
  })

  it('keeps the capri:// scheme the deployed index.html bounces to', () => {
    // The web page's inline bounce script hardcodes this. Changing it breaks
    // sign-in for both providers at once.
    expect(base44Config.authCallbackScheme).toBe('capri')
  })
})

describe('backend identity', () => {
  it('points at the confirmed Base44 app id', () => {
    // Verified against the live backend: public-settings echoes this id back.
    expect(base44Config.appId).toBe('69aa4c4d4f33993320ae7f08')
  })

  it('points at the production Base44 host over https', () => {
    expect(base44Config.appBaseUrl).toBe('https://capriforlifev1.base44.app')
  })
})

describe('bundle identity', () => {
  it('iOS builds under the production bundle id, not the template default', () => {
    // Existing CAPRI accounts, the App Store record, the App Group and the
    // keychain access group all key off this. It sat at
    // `org.reactjs.native.example.$(PRODUCT_NAME)` — the React Native template
    // default — and nothing caught it because iOS has never been built.
    const project = read('ios/CAPRI.xcodeproj/project.pbxproj')
    // Quoting is not stable: `pod install` rewrites this file through the xcodeproj
    // gem, which drops quotes it considers unnecessary. Match either form.
    expect(project).toMatch(
      /PRODUCT_BUNDLE_IDENTIFIER = "?com\.base69aa4c4d4f33993320ae7f08\.app"?;/,
    )
    expect(project).not.toContain('org.reactjs.native.example')
  })

  it('Android builds under the same id', () => {
    expect(read('android/app/build.gradle')).toContain(
      'applicationId "com.base69aa4c4d4f33993320ae7f08.app"',
    )
  })

  it('declares the permissions voice capture needs', () => {
    expect(infoPlist()).toContain('NSMicrophoneUsageDescription')
    expect(infoPlist()).toContain('NSSpeechRecognitionUsageDescription')
  })

  it('declares the photo-library string App Store review demands', () => {
    // ITMS-90683 rejected an upload over this. React Native's image loader
    // references the Photos APIs to support `ph://` URLs, and Apple's static
    // analysis requires a purpose string for the reference alone — the app has no
    // photo picker and never reads the library. Removing this key does not remove a
    // feature, it fails the next upload.
    expect(infoPlist()).toContain('NSPhotoLibraryUsageDescription')
  })

  it('registers the icon font, without which every glyph renders blank', () => {
    expect(infoPlist()).toContain('Ionicons.ttf')
  })
})

describe('the password-reset deep link', () => {
  /**
   * Base44 emails a link to its hosted client, and the app claims it so the reset
   * finishes without leaving CAPRI. That needs three declarations to agree, in three
   * languages, none of which can import the others:
   *
   *   - `navigation/linking.ts`  — the route the URL maps to
   *   - `Info.plist` entitlements — the associated domain, for iOS
   *   - `AndroidManifest.xml`    — an autoVerify intent filter, for Android
   *
   * Drop any one and the link silently opens a browser instead.
   */
  const linkingSource = () => read('src/navigation/linking.ts')

  it('routes the path Base44 actually emails', () => {
    // The web client's route is `/reset-password`; a mismatch here means the link
    // opens the app and lands nowhere.
    expect(linkingSource()).toContain("ResetPassword: 'reset-password'")
  })

  it('claims only that path, not the whole host', () => {
    // The association file offers `paths: ["*"]`. Taking all of it would intercept
    // the web client's OAuth bounce page and break provider sign-in.
    const manifest = read('android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('android:pathPrefix="/reset-password"')
    expect(manifest).not.toContain('android:pathPattern=".*"')
  })

  it('forwards links to JS on iOS, which nothing else does', () => {
    // The entitlement gets the OS to open the app; these two AppDelegate hooks are
    // what hand the URL to React Native. Without them a Universal Link opens the app
    // onto whatever screen it was already showing and nothing happens — which looks
    // identical to the entitlement being wrong.
    const appDelegate = read('ios/CAPRI/AppDelegate.swift')

    expect(appDelegate).toContain('RCTLinkingManager.application(app, open: url')
    expect(appDelegate).toContain('continue userActivity: NSUserActivity')
  })

  it('declares the domain on both platforms, matching the backend host', () => {
    const host = new URL(base44Config.appBaseUrl).host

    expect(read('android/app/src/main/AndroidManifest.xml')).toContain(`android:host="${host}"`)
    expect(read('android/app/src/main/AndroidManifest.xml')).toContain('android:autoVerify="true"')
    for (const file of ['ios/CAPRI/CAPRI.entitlements', 'ios/CAPRI/CAPRIRelease.entitlements']) {
      expect(read(file)).toContain(`applinks:${host}`)
    }
  })
})

describe('a missing Firebase config does not fail the iOS build', () => {
  /**
   * `@react-native-firebase/crashlytics` installs a build phase that runs Firebase's
   * dSYM upload, which reads `GOOGLE_APP_ID` from `GoogleService-Info.plist` under
   * `set -e`. With no config file the build dies:
   *
   *   Could not get GOOGLE_APP_ID in Google Services file from build environment
   *
   * The project has never had that file. Android already skips Firebase when its
   * config is absent, and the app copes at runtime, so iOS was the only place where
   * a missing *optional* integration was fatal.
   */
  const podfile = () => read('ios/Podfile')

  it('guards the Crashlytics phase on the config file', () => {
    expect(podfile()).toContain('GoogleService-Info.plist')
    expect(podfile()).toContain('skipping Crashlytics dSYM upload')
  })

  it('patches after integration, where the change survives', () => {
    // `post_install` runs *before* CocoaPods writes the user project, so a patch
    // made there is saved and then immediately overwritten. This cost a cycle to
    // find; the hook name is the fix.
    expect(podfile()).toContain('post_integrate do |installer|')
  })

  it('leaves the shebang on the first line of the phase', () => {
    // A guard inserted above `#!/usr/bin/env bash` would stop it being a shebang.
    // The name appears twice: once listing the phase, once defining it. The
    // definition carries the script, and it is the later of the two.
    const project = read('ios/CAPRI.xcodeproj/project.pbxproj')
    const at = project.lastIndexOf('[CP-User] [RNFB] Crashlytics Configuration')
    const phase = project.slice(at, project.indexOf('};', at))

    // Newlines are escaped inside the pbxproj string, hence `\\n`.
    expect(phase).toContain('shellScript = "#!/usr/bin/env bash\\n')
    expect(phase.indexOf('skipping Crashlytics dSYM upload')).toBeLessThan(
      phase.indexOf('FirebaseCrashlytics/run'),
    )
  })
})

describe('the app icon is the shipped one, on both platforms', () => {
  /**
   * `src/assets/images/capri-mark.png` is pixel-identical to the icon the live app
   * ships, and both platforms are generated from it — so an update cannot arrive
   * wearing a different face. iOS had **no icon at all** before this: the asset
   * catalogue held a Contents.json listing sizes and not one image, which App Store
   * Connect rejects outright.
   */
  const iosIcon = join(root, 'ios/CAPRI/Images.xcassets/AppIcon.appiconset/AppIcon-1024.png')
  const android = (density: string, file: string) =>
    join(root, `android/app/src/main/res/mipmap-${density}/${file}`)

  it('ships the 1024 marketing icon iOS requires', () => {
    // A PNG's dimensions live at a fixed offset in the IHDR chunk.
    const bytes = readFileSync(iosIcon)
    expect(bytes.readUInt32BE(16)).toBe(1024)
    expect(bytes.readUInt32BE(20)).toBe(1024)
  })

  it('ships every Android density, square and round', () => {
    for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
      expect(readFileSync(android(density, 'ic_launcher.png')).length).toBeGreaterThan(0)
      expect(readFileSync(android(density, 'ic_launcher_round.png')).length).toBeGreaterThan(0)
      // The adaptive layer, without which Android 8+ masks the artwork itself.
      expect(readFileSync(android(density, 'ic_launcher_foreground.png')).length).toBeGreaterThan(0)
    }
  })

  it('declares the adaptive icon against the ground of the artwork', () => {
    const adaptive = read('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml')
    expect(adaptive).toContain('@color/ic_launcher_background')
    expect(adaptive).toContain('@mipmap/ic_launcher_foreground')
    // Sampled from the shipped art; a mismatch shows as a ring around the mark.
    expect(read('android/app/src/main/res/values/ic_launcher_background.xml')).toContain('#1A2535')
  })
})

describe('shipping as the next version of the live app', () => {
  /**
   * This app replaces the Capacitor build in the same App Store record rather than
   * arriving as a new listing — same bundle id, same team, same subscription
   * products, so existing accounts and entitlements carry over. What makes it an
   * *update* rather than a rejected upload is being numerically ahead of what is
   * live: 2.117896.7, build 16.
   */
  const project = () => read('ios/CAPRI.xcodeproj/project.pbxproj')

  /** The last build of the Capacitor app on the App Store. */
  const LIVE_BUILD = 16

  /** Every build config has to carry the same number, or one target ships stale. */
  const iosBuildNumbers = (): readonly number[] =>
    [...project().matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)].map((match) => Number(match[1]))

  const androidVersionCode = (): number =>
    Number(/\n\s*versionCode (\d+)/.exec(read('android/app/build.gradle'))?.[1])

  /**
   * Asserted as a rule rather than a literal, so releasing does not mean editing a
   * test. Pinning the exact number made this fail on every bump, which trains
   * people to update it without reading it — and a guard nobody reads is not a
   * guard.
   */
  it('outranks the build already on the App Store', () => {
    expect(project()).toContain('MARKETING_VERSION = 3.0.0;')
    expect(iosBuildNumbers().length).toBeGreaterThan(0)
    for (const build of iosBuildNumbers()) expect(build).toBeGreaterThan(LIVE_BUILD)

    // The React Native template defaults would be rejected on upload.
    expect(project()).not.toContain('MARKETING_VERSION = 1.0;')
    expect(project()).not.toContain('CURRENT_PROJECT_VERSION = 1;')
  })

  it('uses one build number across every iOS configuration', () => {
    expect(new Set(iosBuildNumbers()).size).toBe(1)
  })

  it('keeps Android in step, so the two cannot drift apart', () => {
    expect(read('android/app/build.gradle')).toContain('versionName "3.0.0"')
    expect(androidVersionCode()).toBe(iosBuildNumbers()[0])
  })

  it('signs with the team that owns the shipped app', () => {
    // A different team cannot sign this bundle id at all.
    expect(project()).toContain('DEVELOPMENT_TEAM = 6672DRVT87;')
  })

  it('wires entitlements into both configurations', () => {
    // The entitlements file existed but nothing referenced it, so the App Group,
    // the shared keychain group and push were all inert.
    expect(project()).toContain('CODE_SIGN_ENTITLEMENTS = CAPRI/CAPRI.entitlements;')
    expect(project()).toContain('CODE_SIGN_ENTITLEMENTS = CAPRI/CAPRIRelease.entitlements;')
  })

  it('asks for production APNs in release and development in debug', () => {
    // `aps-environment` has to match the provisioning profile, which is why there
    // are two files rather than one that is wrong half the time.
    expect(read('ios/CAPRI/CAPRI.entitlements')).toContain('<string>development</string>')
    expect(read('ios/CAPRI/CAPRIRelease.entitlements')).toContain('<string>production</string>')
  })
})

describe('the crypto polyfill loads before anything that needs it', () => {
  const entryPoint = () => read('index.js')

  it('index.js imports react-native-get-random-values', () => {
    // The Base44 SDK stamps every request with uuidv4(), and uuid v13 needs
    // crypto.getRandomValues(), which Hermes does not provide. Without this
    // every API call throws before it leaves the device.
    expect(entryPoint()).toContain("import 'react-native-get-random-values'")
  })

  it('imports it before the app, which pulls in the SDK', () => {
    const source = entryPoint()
    const polyfillAt = source.indexOf("import 'react-native-get-random-values'")
    // Matched as an import, not a bare path: the explanatory comment above the
    // polyfill also names the App module, and would otherwise match first.
    const appAt = source.indexOf("from './src/App'")

    expect(polyfillAt).toBeGreaterThanOrEqual(0)
    expect(appAt).toBeGreaterThanOrEqual(0)
    // Reordering these silently breaks every network call, with no type or lint
    // error to catch it.
    expect(polyfillAt).toBeLessThan(appAt)
  })
})

describe('theme tokens exist for the splash colours', () => {
  it('exposes the light and dark backgrounds the launch screen matches', () => {
    expect(palette.white).toBe('#FFFFFF')
    expect(palette.slate950).toBe('#020617')
  })
})

/**
 * The widget extension runs in its own process and cannot import a line of the
 * app's TypeScript, so every value it needs is duplicated in Swift. Each of these
 * failures is invisible at runtime — the widget simply renders "Open CAPRI to sign
 * in" forever, or quietly talks to the wrong backend.
 */
describe('a task has one URL, and every surface uses it', () => {
  const taskURL = `${base44Config.authCallbackScheme}://${TASK_LINK_PATH}/`

  it('the route table maps the task path', () => {
    expect(linkingConfig()).toContain('TaskDetail')
    expect(linkingConfig()).toContain('TASK_LINK_PATH')
  })

  it('a tapped notification builds that URL', () => {
    // The reminder push carries `task_id`; this is what turns it into a route.
    expect(appDelegate()).toContain('"task_id"')
    expect(appDelegate()).toContain(taskURL)
  })

  it('a tapped widget builds the same URL', () => {
    // A widget extension cannot import the app's constants, so this is the guard
    // that keeps its hardcoded copy honest.
    expect(widgetSwift()).toContain(taskURL)
  })

  it('a tap on the widget itself goes to Home, by a real path', () => {
    // The bare scheme matches no route, and an unmatched link leaves the app on
    // whatever it last showed — the widget looked like it reopened Profile. The
    // Swift copy is hardcoded, so this is what keeps it pointing at Home.
    const homeURL = `${base44Config.authCallbackScheme}://${HOME_LINK_PATH}`
    expect(widgetSwift()).toContain(`"${homeURL}"`)
    expect(widgetSwift()).toContain('.widgetURL(CapriShared.homeURL)')
    expect(widgetSwift()).not.toContain('.widgetURL(CapriShared.taskURL')
  })

  it('the route table resolves Home through the tab navigator', () => {
    // Home is a tab. A path mapped at the stack level would match and then fail
    // to select the tab, which reads the same as not matching at all.
    expect(linkingConfig()).toContain('HOME_LINK_PATH')
    expect(linkingConfig()).toMatch(/Tabs:\s*\{\s*screens:\s*\{\s*Home:\s*HOME_LINK_PATH/)
  })

  it('the widget makes each queued task its own tap target', () => {
    // One `widgetURL` for the whole medium widget would send every tap to the
    // hero, which is worse than not being tappable.
    expect(widgetSwift()).toContain('Link(destination:')
    expect(widgetSwift()).toContain('.widgetURL(')
  })

  it('a notification tap is parked rather than emitted', () => {
    // Emitting races React Native's startup, and loses on the cold launch a user
    // is most likely to notice.
    expect(appDelegate()).toContain('CapriDeepLink.park')
    expect(linkingConfig()).toContain('takePendingLink')
  })
})

describe('refreshing the widget has exactly one owner', () => {
  it('only reloadAll asks WidgetKit to rebuild', () => {
    /**
     * Storage writes must stay silent. They used to reload, and callers reload
     * deliberately after writing, so a single publish rebuilt the timeline twice
     * and the launch-time cleanup of a key that rarely exists rebuilt it for
     * nothing. Apple throttles apps that reload too often, so the waste is paid
     * back later as refreshes that do not happen.
     */
    const calls = appGroupSwift().match(/Self\.reloadWidgets\(\)/g) ?? []
    expect(calls).toHaveLength(1)
  })

  it('the caller reloads after publishing, so one change is one rebuild', () => {
    const hook = read('src/features/tasks/hooks/useWidgetSnapshot.ts')
    expect(hook).toContain('publishWidgetSnapshot(snapshot).then(reloadWidgets)')
  })

  it('the legacy-token cleanup reloads nothing', () => {
    // It runs on every launch and removes a key that exists only on phones
    // upgraded from the Capacitor app.
    const publisher = read('src/features/tasks/services/widgetPublisher.ts')
    const cleanup = publisher.slice(publisher.indexOf('clearLegacyWidgetToken'))
    expect(cleanup).not.toContain('reloadAll')
  })
})

describe('the widget extension agrees with the app', () => {
  it('reads the Keychain service the app writes', () => {
    // The single most breakable link: the app files the token under this service
    // name, and the widget looks it up by exactly this string.
    expect(widgetSwift()).toContain(keychainServiceFor(SECRET_KEYS.accessToken))
  })

  it('looks up the account name react-native-keychain stores', () => {
    // The library puts the key itself in the account slot; querying the wrong
    // account finds nothing even with the right service.
    expect(widgetSwift()).toContain(`"${SECRET_KEYS.accessToken}"`)
  })

  it('shares the Keychain access group with the app', () => {
    // Neither side passes an access group at runtime, so iOS files the item under
    // the first entry in the entitlements — which must therefore be the same one.
    expect(widgetEntitlements()).toContain(`$(AppIdentifierPrefix)${KEYCHAIN_ACCESS_GROUP}`)
    expect(entitlements()).toContain(`$(AppIdentifierPrefix)${KEYCHAIN_ACCESS_GROUP}`)
  })

  it('shares the App Group, so the cached feed is the same store', () => {
    expect(widgetSwift()).toContain(APP_GROUP_ID)
    expect(widgetEntitlements()).toContain(APP_GROUP_ID)
  })

  it('calls the same backend the app calls', () => {
    expect(widgetSwift()).toContain(base44Config.appBaseUrl)
  })

  it('deletes the credential the Capacitor app left in shared storage', () => {
    // The old app published the session token under this key. Upgrading keeps the
    // container, so the app has to remove it explicitly.
    expect(LEGACY_WIDGET_TOKEN_KEY).toBe('capri_widget_token')
    expect(read('src/features/tasks/services/widgetPublisher.ts')).toContain(
      'LEGACY_WIDGET_TOKEN_KEY',
    )
  })

  it('never reads the token from App Group storage', () => {
    // How the Capacitor app did it: a live credential in an unencrypted store that
    // rides into device backups. The Keychain read is the reason this port exists.
    expect(widgetSwift()).not.toContain('capri_widget_token')
    expect(widgetSwift()).toContain('SecItemCopyMatching')
  })

  it('reads the snapshot key the app publishes to', () => {
    // The app writes here and the widget reads here. A typo on either side is a
    // permanently empty widget with nothing in any log to explain it.
    expect(widgetSwift()).toContain(WIDGET_SNAPSHOT_KEY)
  })

  it('agrees on the snapshot shape version', () => {
    expect(widgetSwift()).toContain(`snapshotSchema = ${String(WIDGET_SNAPSHOT_SCHEMA)}`)
  })

  it('agrees on when a snapshot has gone stale', () => {
    // Disagreement here means either needless network calls or a widget that trusts
    // data the app considers expired.
    expect(widgetSwift()).toContain(
      `snapshotMaxAgeHours = ${String(WIDGET_SNAPSHOT_MAX_AGE_HOURS)}`,
    )
  })

  it('reads a pushed snapshot from the key the backend sends', () => {
    // The likeliest bug in the push path, and the hardest to notice: delivered,
    // unrecognised, silently ignored.
    expect(appDelegate()).toContain(`"${WIDGET_PUSH_PAYLOAD_KEY}"`)
  })

  it('writes a pushed snapshot to the key the widget reads', () => {
    expect(appDelegate()).toContain('widgetSnapshotKey')
    expect(appGroupSwift()).toContain(`widgetSnapshotKey = "${WIDGET_SNAPSHOT_KEY}"`)
  })

  it('registers for remote notifications without waiting for permission', () => {
    // Registration is the route; permission is only whether an alert may appear.
    // Requiring permission first cut off the silent pushes the widget depends on.
    expect(appDelegate()).toContain('application.registerForRemoteNotifications()')
  })

  it('keeps the widget kind the Capacitor app registered', () => {
    // An existing placed widget is bound to this identifier; changing it makes the
    // user's widget vanish on upgrade rather than carry over.
    expect(widgetSwift()).toContain('"CapriDailyPriorities"')
  })
})
