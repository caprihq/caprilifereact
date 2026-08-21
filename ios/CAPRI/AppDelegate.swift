import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
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

    return true
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
