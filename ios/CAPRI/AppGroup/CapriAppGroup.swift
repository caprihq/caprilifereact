import Foundation
import WidgetKit
import React

/**
 * Shared App Group storage for NON-SECRET data the CAPRI home-screen widget
 * needs — it runs in a separate process and cannot read the app's storage.
 *
 *   suite  group.com.base69aa4c4d4f33993320ae7f08.app
 *
 * ⚠️ The session token does NOT belong here. UserDefaults is unencrypted and
 * lands in device backups; it used to hold the token, which was the only
 * plaintext copy in the app. The token now lives once in the Keychain, in an
 * access group the widget extension shares — see keychain-access-groups in
 * CAPRI.entitlements. The widget reads it with SecItemCopyMatching, using the
 * service name `keychainServiceFor` builds in src/services/storage/keys.ts.
 *
 * Requires the App Group capability on both the app target and the widget
 * extension target. Without it `UserDefaults(suiteName:)` returns nil and
 * every call rejects rather than silently doing nothing.
 */
@objc(CapriAppGroup)
class CapriAppGroup: NSObject {
  private static let appGroupId = "group.com.base69aa4c4d4f33993320ae7f08.app"

  /// Not touching the UI, so it can stay off the main queue.
  @objc static func requiresMainQueueSetup() -> Bool { false }

  private func defaults() -> UserDefaults? {
    UserDefaults(suiteName: Self.appGroupId)
  }

  @objc(setItem:value:resolver:rejecter:)
  func setItem(_ key: String,
               value: String,
               resolve: RCTPromiseResolveBlock,
               reject: RCTPromiseRejectBlock) {
    guard let store = defaults() else {
      reject("app_group_unavailable", "App Group \(Self.appGroupId) is not configured.", nil)
      return
    }
    store.set(value, forKey: key)
    Self.reloadWidgets()
    resolve(nil)
  }

  @objc(removeItem:resolver:rejecter:)
  func removeItem(_ key: String,
                  resolve: RCTPromiseResolveBlock,
                  reject: RCTPromiseRejectBlock) {
    guard let store = defaults() else {
      reject("app_group_unavailable", "App Group \(Self.appGroupId) is not configured.", nil)
      return
    }
    store.removeObject(forKey: key)
    Self.reloadWidgets()
    resolve(nil)
  }

  @objc(getItem:resolver:rejecter:)
  func getItem(_ key: String,
               resolve: RCTPromiseResolveBlock,
               reject: RCTPromiseRejectBlock) {
    resolve(defaults()?.string(forKey: key))
  }

  /// Synchronous so JS can branch on availability without awaiting.
  @objc(isAvailable)
  func isAvailable() -> NSNumber {
    NSNumber(value: defaults() != nil)
  }

  /// Ask WidgetKit to rebuild timelines now that shared data changed.
  private static func reloadWidgets() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
