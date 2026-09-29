import { NativeModules } from 'react-native'

import { metric } from '@/utils'

/**
 * How long it takes to get to a usable screen.
 *
 * Measured rather than estimated, because startup work is the one area where
 * intuition is reliably wrong: the obvious suspect is rarely the expensive one, and
 * without a number "improve performance" has no finish line.
 *
 * The clock starts in `AppDelegate` before React Native exists — a timer started in
 * JavaScript would miss the runtime and the bundle, which is most of the cost, and
 * report flattering nonsense. It stops when Home has data on screen, which is the
 * moment the app is usable rather than merely visible.
 *
 * Reported through `metric`, which survives into release builds — a debug build
 * fetches its JavaScript from Metro over the network, so its timing says almost
 * nothing about what a user experiences. Once per launch, one line.
 */

type StartupModule = { reportUsable: (label: string) => Promise<number | null> }

const nativeModule = (NativeModules as Record<string, unknown>).CapriStartup as
  | StartupModule
  | undefined

let reported = false

export const reportTimeToUsable = async (label: string): Promise<void> => {
  if (reported) return
  reported = true

  try {
    // Measured and logged natively: the clock started before React Native existed,
    // and a release build does not forward `console` anywhere readable.
    const ms = await nativeModule?.reportUsable(label)
    if (typeof ms === 'number') metric('startup:usable', { label, ms: Math.round(ms) })
  } catch {
    // A missing module means an older build or Android; not worth a warning.
  }
}
