import { NativeModules } from 'react-native'

/**
 * Links that arrived while JavaScript was not listening.
 *
 * A tapped notification is not a URL open: iOS hands it to the app delegate, and if
 * the tap cold-launched the app there is no React yet to receive it. Emitting the
 * link there and hoping the bridge is up is a race that loses on exactly the launch
 * everyone notices.
 *
 * So the native side never emits. It parks the link, and JavaScript drains it — at
 * startup through `getInitialURL`, and on resume through the linking subscription.
 * One place to write, one place to read, cleared on read, so a link is delivered
 * once and a stale one cannot replay on some later launch.
 */
type CapriDeepLinkModule = {
  /** Returns the parked link and forgets it. Null when there is none. */
  takePendingLink: () => Promise<string | null>
}

const nativeModule = (NativeModules as Record<string, unknown>).CapriDeepLink as
  | CapriDeepLinkModule
  | undefined

export const takePendingLink = async (): Promise<string | null> => {
  try {
    return (await nativeModule?.takePendingLink()) ?? null
  } catch {
    // No module (Android, or before a rebuild) is not an error: there is simply
    // nothing parked.
    return null
  }
}
