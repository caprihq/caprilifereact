import {
  getCrashlytics,
  log,
  recordError,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics'

import { logWarn } from '@/utils'

/**
 * Crashlytics wrapper.
 *
 * @react-native-firebase v26 exposes a modular API (free functions taking a
 * Crashlytics instance) — the older `crashlytics().log()` namespaced style is
 * gone.
 *
 * Wrapped rather than called directly so that (a) reporting can be disabled in
 * one place, (b) tests need no Firebase, and (c) nothing PII-bearing is ever
 * attached by accident — only the opaque Base44 user id, never email or name.
 */

export const initCrashReporting = async (): Promise<void> => {
  try {
    await setCrashlyticsCollectionEnabled(getCrashlytics(), true)
  } catch (error) {
    logWarn('[crashlytics] could not enable collection', error)
  }
}

/** Associate crashes with a user. Pass null on sign-out. */
export const setCrashUser = (userId: string | null): void => {
  try {
    void setUserId(getCrashlytics(), userId ?? '')
  } catch (error) {
    logWarn('[crashlytics] setUserId failed', error)
  }
}

/** Breadcrumb — shows up in the log attached to the next crash. */
export const logBreadcrumb = (message: string): void => {
  try {
    log(getCrashlytics(), message)
  } catch (error) {
    logWarn('[crashlytics] log failed', error)
  }
}

/** Report a handled error, keeping the app alive. */
export const reportError = (error: unknown, context?: string): void => {
  try {
    const instance = getCrashlytics()
    if (context) log(instance, context)
    recordError(instance, error instanceof Error ? error : new Error(String(error)))
  } catch (reportingError) {
    logWarn('[crashlytics] recordError failed', reportingError)
  }
}
