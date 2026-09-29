import Foundation

/**
 * A link that arrived before JavaScript could hear it.
 *
 * A tapped notification is not a URL open. iOS delivers it to the app delegate, and
 * on a cold launch React Native is still starting — so emitting the link there and
 * hoping the bridge is ready is a race, and it loses on precisely the launch a user
 * notices: the one where they tapped a reminder and landed on the wrong screen.
 *
 * This parks the link instead. JavaScript drains it at startup and on every
 * foreground (`src/navigation/linking.ts`). Reading clears it, so a link is
 * delivered once and a stale one cannot replay weeks later.
 *
 * Deliberately not App Group storage: this is process-local, short-lived, and no
 * business of the widget.
 */
@objc(CapriDeepLink)
class CapriDeepLink: NSObject {
  /// Static, because the app delegate writes it and the bridge module reads it.
  private static let lock = NSLock()
  private static var pending: String?

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Called from `AppDelegate` when a notification tap names a destination.
  static func park(_ link: String) {
    lock.lock()
    defer { lock.unlock() }
    pending = link
  }

  @objc(takePendingLink:rejecter:)
  func takePendingLink(resolve: @escaping (Any?) -> Void,
                       reject: @escaping (String?, String?, Error?) -> Void) {
    Self.lock.lock()
    let link = Self.pending
    Self.pending = nil
    Self.lock.unlock()

    resolve(link)
  }
}
