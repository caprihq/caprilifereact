import UIKit
import FirebaseCore
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import WidgetKit
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  /// Whoever held the notification delegate before us — forwarded to, never dropped.
  private weak var previousNotificationDelegate: UNUserNotificationCenterDelegate?
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Stamped before anything else, so the measurement includes React Native's own
    // startup rather than beginning after it.
    CapriStartup.launchedAtMs = Date().timeIntervalSince1970 * 1000

    /// Firebase, before React Native starts.
    ///
    /// react-native-firebase documents this as automatic — it swizzles the app
    /// delegate from an ObjC `+load`. That does not happen here, and the app logged
    /// "The default Firebase app has not yet been configured" on every launch while
    /// Analytics, Crashlytics and the push token all silently did nothing. Calling it
    /// explicitly is what the Firebase SDK itself asks for and costs nothing if the
    /// swizzle ever does run: `configure()` is idempotent past the first call.
    ///
    /// Guarded on the plist because the project ships without it on purpose — a
    /// missing config is a disabled integration, never a crash at launch.
    if FirebaseApp.app() == nil,
       Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "CAPRI",
      in: window,
      launchOptions: launchOptions
    )

    /**
     * Register for remote notifications at launch, before anyone is asked anything.
     *
     * Registration and permission are different things, and conflating them broke
     * the widget. Registration is what gives iOS a route to this app and is allowed
     * without asking the user; permission is what lets a notification *appear*.
     * Silent pushes — the ones that carry a new widget snapshot — need only the
     * former.
     *
     * Until this, the app registered only inside the notification-permission flow,
     * so someone who declined alerts had no route at all and their home-screen
     * widget could never update while the app was closed. Alerts still respect the
     * refusal: iOS drops an alert push for an unauthorised app.
     */
    application.registerForRemoteNotifications()

    /**
     * Own the notification delegate, so a tapped reminder can open the task it is
     * about instead of dumping the user on whatever screen they left.
     *
     * Firebase's messaging SDK also wants this seat — it is here for Crashlytics and
     * the APNs token, and the app uses none of its notification callbacks. Rather
     * than assume that stays true, whatever was set before is kept and forwarded to.
     */
    previousNotificationDelegate = UNUserNotificationCenter.current().delegate
    UNUserNotificationCenter.current().delegate = self

    return true
  }

  // MARK: - APNs registration

  /**
   * The device's push address, from iOS.
   *
   * CAPRI posts straight to Apple with its own key, so nothing in the delivery path
   * is Firebase — and the token should not come from there either. Handing it to
   * `CapriPush` lets `registerPushToken` read it without any SDK in between.
   */
  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    CapriPush.received(deviceToken)
  }

  /**
   * Registration failed.
   *
   * Ordinary on a simulator, on a build signed without the entitlement, and with no
   * network at launch. Reported so anyone waiting on a token stops waiting, rather
   * than holding a promise open until it times out.
   */
  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    NSLog("[CAPRI][push] registration failed: %@", error.localizedDescription)
    CapriPush.failed()
  }

  // MARK: - Notifications

  /**
   * A reminder was tapped.
   *
   * The push carries the task it is about, so the tap becomes the same URL a widget
   * tap or a shared link produces — one route table, three doors. The link is parked
   * rather than emitted: on a cold launch React Native is not listening yet, and
   * JavaScript drains it deterministically instead. See `CapriDeepLink`.
   */
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    if let taskId = userInfo["task_id"] as? String, !taskId.isEmpty {
      CapriDeepLink.park("capri://task/\(taskId)")
    }

    if let previous = previousNotificationDelegate,
       previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:))) {
      previous.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
      return
    }
    completionHandler()
  }

  /**
   * Show a reminder even while CAPRI is open.
   *
   * iOS suppresses notifications for the foreground app by default, which for a
   * reminder is exactly wrong: "in 10 minutes" is worth seeing whether or not the
   * app happens to be on screen.
   */
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound, .list])
  }

  /// Custom-scheme links — `capri://…`.
  ///
  /// Without this the system launches the app and the URL is dropped on the floor:
  /// `Linking.getInitialURL()` returns nil and React Navigation never routes. Note
  /// that provider sign-in does *not* depend on it — `ASWebAuthenticationSession`
  /// captures its own callback — which is why the app got this far without it.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }

  /// Universal Links — `https://capriforlifev1.base44.app/reset-password?token=…`.
  ///
  /// These arrive as a user activity rather than a URL open, so they need their own
  /// hook. Base44 serves the association file for this bundle id, and the
  /// entitlement claims the domain; this is the last of the three, and the one that
  /// hands the link to JS. Missing it looks exactly like a broken deep link: the app
  /// opens on whatever screen it was on and nothing happens.
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  /**
   * Silent push carrying a new widget snapshot.
   *
   * The home-screen widget draws what the app publishes into shared storage. That
   * covers everything the user does in the app, and nothing that happens while the
   * app is closed — a task added in the browser, a recurring task rolling over, a
   * scheduled event completing itself. The backend sends the new snapshot in a
   * background push, and this writes it and asks WidgetKit to redraw.
   *
   * **Deliberately no JavaScript.** React Native may not be running, and starting it
   * to copy one string would burn the few seconds iOS grants a background push. This
   * is `UserDefaults` and one WidgetKit call, so it also works while the phone is
   * locked — where the widget could not read the session token even if it wanted to.
   *
   * `.newData` is reported only when a snapshot actually arrived. iOS budgets these
   * pushes against how useful they turn out to be, so claiming new data for an
   * unrelated notification would spend that budget and get the app throttled.
   */
  func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    guard let snapshot = userInfo["widget_snapshot"] as? String,
          let data = snapshot.data(using: .utf8),
          let store = UserDefaults(suiteName: CapriAppGroup.appGroupId) else {
      completionHandler(.noData)
      return
    }

    store.set(data, forKey: CapriAppGroup.widgetSnapshotKey)
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    completionHandler(.newData)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
