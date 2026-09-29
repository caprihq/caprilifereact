import Foundation

/**
 * When the process began, so startup can be measured rather than guessed at.
 *
 * "Make it faster" is not a task anyone can finish; the first honest step is a
 * number. JavaScript cannot produce one on its own — by the time any JS runs, the
 * expensive part (dyld, the runtime, the bundle) has already happened, so a timer
 * started there measures the cheap half and reports good news.
 *
 * This is stamped in `didFinishLaunching`, before React Native starts. It excludes
 * pre-main dynamic linking, which is typically a hundred milliseconds or two, so
 * treat the number as a floor rather than the whole truth.
 */
@objc(CapriStartup)
class CapriStartup: NSObject {
  /// Milliseconds since the epoch, set once at launch.
  static var launchedAtMs: Double = 0

  @objc static func requiresMainQueueSetup() -> Bool { false }

  /**
   * Report — and log — how long the app took to become usable.
   *
   * The logging happens here rather than in JavaScript because a release build does
   * not forward `console` to the system log, and release is the only build whose
   * timing means anything: debug fetches its JavaScript from Metro over the network.
   * `NSLog` reaches Console.app on a real device and `log show` on a simulator, in
   * every configuration.
   */
  @objc(reportUsable:resolver:rejecter:)
  func reportUsable(_ label: String,
                    resolve: @escaping (Any?) -> Void,
                    reject: @escaping (String?, String?, Error?) -> Void) {
    guard Self.launchedAtMs > 0 else {
      resolve(nil)
      return
    }

    let elapsed = Date().timeIntervalSince1970 * 1000 - Self.launchedAtMs
    NSLog("[CAPRI][metric] startup:usable label=%@ ms=%.0f", label, elapsed)
    resolve(elapsed)
  }
}
