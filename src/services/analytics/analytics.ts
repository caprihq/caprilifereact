import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperties,
} from '@react-native-firebase/analytics'

import { mmkvPrefStore } from '@/services/storage'
import type { User } from '@/types/entities'
import { logWarn } from '@/utils'
import { daysSinceSignup, isNewAccount, userPropertiesFor } from './audience'
import type { AnalyticsEvent, CaptureInput, Engine, TrackedScreen } from './events'

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

/**
 * Collection is on for release builds only.
 *
 * Development builds used to send everything, so a day in the simulator showed up in
 * the same reports as App Store customers. The app delegate switches collection off
 * natively too, before Firebase's own launch events; this keeps JavaScript from
 * switching it back on.
 */
export const initAnalytics = async (): Promise<void> => {
  try {
    await setAnalyticsCollectionEnabled(getAnalytics(), !__DEV__)
  } catch (error) {
    logWarn('[analytics] could not set collection', error)
  }
}

/** Who is signed in, kept for the activation events. Never the email. */
let signup: { readonly id: string; readonly createdDate: string | undefined } | null = null

/**
 * Who is using the app, as an opaque id, plus the properties reports are split by.
 *
 * The Base44 user id and nothing else — never the email or display name. Pass null on
 * sign-out so the next person's activity is not filed under the last one's.
 */
export const setAnalyticsUser = (user: User | null): void => {
  signup = user ? { id: user.id, createdDate: user.created_date } : null
  try {
    void setUserId(getAnalytics(), user?.id ?? null)
    if (user) void setUserProperties(getAnalytics(), userPropertiesFor(user))
  } catch (error) {
    logWarn('[analytics] setUserId failed', error)
  }
}

/**
 * Which plan the user is on, so every other number can be read by tier.
 *
 * Set at sign-in, and again whenever the plan is re-checked, so an upgrade shows from
 * the moment it lands rather than from the next launch.
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

type FirstEvent = 'first_task_created' | 'first_up_next_success'

/**
 * An activation milestone: once per new account on this device.
 *
 * Only for accounts inside the activation window (see `ACTIVATION_WINDOW_DAYS`), and
 * remembered on the device so a repeat does not inflate the event count. Firebase
 * counts unique users on top of that, so a reinstall cannot count someone twice.
 */
const trackFirst = (name: FirstEvent): void => {
  if (!signup) return
  const days = daysSinceSignup(signup.createdDate, Date.now())
  if (!isNewAccount(days)) return

  const key = `capri.analytics.${name}.${signup.id}`
  try {
    if (mmkvPrefStore.getString(key) === 'sent') return
    mmkvPrefStore.setString(key, 'sent')
  } catch (error) {
    logWarn(`[analytics] ${name} flag unreadable`, error)
    return
  }
  track({ name, params: { days_since_signup: days } })
}

/**
 * A task was saved from the capture sheet.
 *
 * `firstForAccount` is the caller's knowledge that the account had no tasks at all
 * before this one; only then is it the account's first.
 */
export const trackTaskCreated = (created: {
  readonly input: CaptureInput
  readonly parser: Engine
  readonly firstForAccount: boolean
}): void => {
  track({ name: 'task_created', params: { input: created.input, parser: created.parser } })
  if (created.firstForAccount) trackFirst('first_task_created')
}

/**
 * Up Next was ranked afresh.
 *
 * `fromModel` is true only when the model answered with tasks the app could show. A
 * fallback to the local ranking is still a refresh, but not a successful
 * recommendation.
 */
export const trackRanking = (ranking: {
  readonly fromModel: boolean
  readonly manual: boolean
}): void => {
  track({
    name: 'up_next_refreshed',
    params: {
      source: ranking.fromModel ? 'ai' : 'local',
      trigger: ranking.manual ? 'manual' : 'auto',
    },
  })
  if (ranking.fromModel) trackFirst('first_up_next_success')
}
