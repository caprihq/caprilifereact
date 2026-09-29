import Foundation

/**
 * The device's APNs token, straight from iOS.
 *
 * WHY THIS EXISTS RATHER THAN A LIBRARY CALL
 *   CAPRI sends push by signing a JWT with its own `.p8` and posting to
 *   `api.push.apple.com`. Nothing in that path is Firebase. The app was still
 *   asking `@react-native-firebase/messaging` for the token, which meant the one
 *   Apple-only feature in the product could not work unless an unrelated SDK had
 *   initialised — and for a long time it had not, so registration silently
 *   returned nothing and no reminder could ever be delivered.
 *
 *   iOS already hands the token to the app delegate. Taking it there removes the
 *   dependency entirely.
 *
 * WHY IT WAITS
 *   `registerForRemoteNotifications()` is asynchronous: the delegate callback
 *   usually lands within a second of launch, but JavaScript may ask first. So a
 *   request made before the token arrives is held until it does, rather than
 *   answering "no token" to a device that has a perfectly good one.
 *
 * TODO(android): Android has no APNs. When push is added there it needs an FCM
 * token from `@react-native-firebase/messaging`, and the backend's provider router
 * already keys on `PushDevice.provider` to tell the two apart. Out of scope here.
 */
@objc(CapriPush)
class CapriPush: NSObject {
  /// Static: the app delegate writes, the bridge module reads.
  private static let lock = NSLock()
  private static var token: String?
  /// Requests that arrived before the token did.
  private static var waiting: [(String?) -> Void] = []

  /// How long a caller waits before accepting that no token is coming.
  ///
  /// Registration fails silently in ordinary situations — no network at launch, a
  /// simulator, a provisioning profile without the entitlement — and a promise that
  /// never settles would hang sign-in behind it.
  private static let timeout: TimeInterval = 10

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Called from `AppDelegate` when iOS delivers the token.
  @objc static func received(_ deviceToken: Data) {
    // Apple gives raw bytes; the push service expects lowercase hex.
    settle(deviceToken.map { String(format: "%02x", $0) }.joined())
  }

  /// Called from `AppDelegate` when registration fails.
  @objc static func failed() {
    settle(nil)
  }

  private static func settle(_ value: String?) {
    lock.lock()
    if let value { token = value }
    let pending = waiting
    waiting = []
    lock.unlock()

    pending.forEach { $0(value) }
  }

  @objc(getToken:rejecter:)
  func getToken(resolve: @escaping (Any?) -> Void,
                reject: @escaping (String?, String?, Error?) -> Void) {
    Self.lock.lock()
    if let token = Self.token {
      Self.lock.unlock()
      resolve(token)
      return
    }

    // Answer at most once, whichever happens first: the token, or the deadline.
    var answered = false
    let answer: (String?) -> Void = { value in
      guard !answered else { return }
      answered = true
      resolve(value)
    }

    Self.waiting.append(answer)
    Self.lock.unlock()

    DispatchQueue.main.asyncAfter(deadline: .now() + Self.timeout) { answer(nil) }
  }
}
