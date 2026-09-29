import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperties,
} from '@react-native-firebase/analytics'

import { logWarn } from '@/utils'
import type { AnalyticsEvent, TrackedScreen } from './events'

/**
 * Firebase Analytics wrapper.
 *
 * Wrapped for the same reasons as Crashlytics: collection can be switched off in one
 * place, tests need no Firebase, and nothing PII-bearing can be attached by accident.
 * The event names and shapes live in `events.ts`; this file only sends them.
 *
 * **Nothing here ever throws.** Analytics is an observer. An app that crashes because
 * it could not record that it was working is worse than an app with no analytics, and
 * Firebase is absent entirely until `GoogleService-Info.plist` is added.
 *
 * @react-native-firebase v26 uses the modular API — free functions taking an instance,
 * not `analytics().logEvent()`.
 */

export const initAnalytics = async (): Promise<void> => {
  try {
    await setAnalyticsCollectionEnabled(getAnalytics(), true)
  } catch (error) {
    logWarn('[analytics] could not enable collection', error)
  }
}

/**
 * Who is using the app, as an opaque id.
 *
 * The Base44 user id and nothing else — never the email or display name. Pass null on
 * sign-out so the next person's activity is not filed under the last one's.
 */
export const setAnalyticsUser = (userId: string | null): void => {
  try {
    void setUserId(getAnalytics(), userId)
  } catch (error) {
    logWarn('[analytics] setUserId failed', error)
  }
}

/**
 * Which plan the user is on, so every other number can be read by tier.
 *
 * Nearly every question worth asking ends with "…and is that different for people
 * who pay?", and a user property answers it without adding a parameter to each event.
 */
export const setPlanProperty = (plan: string): void => {
  try {
    void setUserProperties(getAnalytics(), { plan })
  } catch (error) {
    logWarn('[analytics] setUserProperties failed', error)
  }
}

/** Record one event from the catalogue. */
export const track = (event: AnalyticsEvent): void => {
  try {
    void logEvent(getAnalytics(), event.name, event.params)
  } catch (error) {
    logWarn(`[analytics] ${event.name} failed`, error)
  }
}

/** Record a screen view. Called by the navigator, not by screens themselves. */
export const trackScreen = (screen: TrackedScreen): void => {
  try {
    void logScreenView(getAnalytics(), { screen_name: screen, screen_class: screen })
  } catch (error) {
    logWarn('[analytics] screen view failed', error)
  }
}
