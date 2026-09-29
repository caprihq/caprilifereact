import Foundation
import WidgetKit

/**
 * Shared App Group storage, and the one way JS can ask WidgetKit to refresh.
 *
 *   suite  group.com.base69aa4c4d4f33993320ae7f08.app
 *
 * ⚠️ The session token does NOT belong here. UserDefaults is unencrypted and lands
 * in device backups; the Capacitor app kept the token here, which was the only
 * plaintext copy of a live credential on the phone. It now lives once in the
 * Keychain, in an access group the widget extension shares — see
 * `keychain-access-groups` in CAPRI.entitlements and `CapriShared.tokenService` in
 * CapriWidget.swift.
 *
 * Deliberately free of any React import. Swift cannot see the React headers without
 * a bridging header in this build, so the promise blocks are declared as plain
 * closures and the module registration lives in CapriAppGroup.m. That keeps this
 * file compiling on its own terms.
 *
 * ⚠️ **Writing does not refresh the widget. `reloadAll` does, and only that.**
 *
 * `setItem` and `removeItem` used to reload on every write, which sounds helpful and
 * double-counted: callers reload deliberately after a write, so one publish asked
 * WidgetKit to rebuild twice, and the once-per-launch cleanup of a key that almost
 * never exists asked it to rebuild for nothing at all. Apple throttles apps that
 * reload too often, so the wasted rebuilds cost real refreshes later.
 *
 * The caller knows whether a write changed anything the widget draws; this module
 * cannot. So the rule is: storage is silent, refreshing is deliberate.
 *
 * Requires the App Group capability on both the app target and the widget extension
 * target. Without it `UserDefaults(suiteName:)` returns nil and every call rejects
 * rather than silently doing nothing.
 */
@objc(CapriAppGroup)
class CapriAppGroup: NSObject {
  /// Shared with `AppDelegate`, which writes a pushed snapshot without touching JS.
  static let appGroupId = "group.com.base69aa4c4d4f33993320ae7f08.app"

  /// `WIDGET_SNAPSHOT_KEY` in modules/capri-app-group/constants.ts.
  static let widgetSnapshotKey = "capri_widget_snapshot"

  /// Not touching the UI, so it can stay off the main queue.
  @objc static func requiresMainQueueSetup() -> Bool { false }

  private func defaults() -> UserDefaults? {
    UserDefaults(suiteName: Self.appGroupId)
  }

  @objc(setItem:value:resolver:rejecter:)
  func setItem(_ key: String,
               value: String,
               resolve: @escaping (Any?) -> Void,
               reject: @escaping (String?, String?, Error?) -> Void) {
    guard let store = defaults() else {
      reject("app_group_unavailable", "App Group \(Self.appGroupId) is not configured.", nil)
      return
    }
    store.set(value, forKey: key)
    resolve(nil)
  }

  @objc(removeItem:resolver:rejecter:)
  func removeItem(_ key: String,
                  resolve: @escaping (Any?) -> Void,
                  reject: @escaping (String?, String?, Error?) -> Void) {
    guard let store = defaults() else {
      reject("app_group_unavailable", "App Group \(Self.appGroupId) is not configured.", nil)
      return
    }
    store.removeObject(forKey: key)
    resolve(nil)
  }

  /**
   * Rebuild the widget's timeline now.
   *
   * This is what the Capacitor app's `setAuth`/`clearAuth` did beyond storing a
   * token: tell WidgetKit that the answer changed. Signing in, signing out or
   * finishing a task all change what the widget should say, and without this the
   * home screen keeps yesterday's answer until its own thirty-minute tick.
   *
   * Nothing is passed and nothing is read — the widget fetches for itself.
   */
  @objc(reloadAll:rejecter:)
  func reloadAll(resolve: @escaping (Any?) -> Void,
                 reject: @escaping (String?, String?, Error?) -> Void) {
    Self.reloadWidgets()
    resolve(nil)
  }

  private static func reloadWidgets() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
