import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'

import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { ThemedStatusBar } from '@/components/ThemedStatusBar/ThemedStatusBar'
import { Toast } from '@/components/Toast'
import { AuthProvider } from '@/features/auth'
import { runBackendPreflight } from '@/features/auth/services/backendPreflight'
import { pruneSignals } from '@/features/tasks/logic/signalsStore'
import { RootNavigator } from '@/navigation'
import { initAnalytics, initCrashReporting } from '@/services'
import {
  hydrateQueryCache,
  queryClient,
  startCachePersistence,
  startFocusBridge,
} from '@/services/api'

/**
 * Composition root.
 *
 * Two providers fewer than before: the theme now lives in Unistyles (no
 * provider at all) and feedback is a Zustand store, so only the toast
 * subscribes rather than the whole tree being wrapped.
 *
 * react-native-bootsplash shows from launch and is hidden by RootNavigator once
 * the session question is answered, so the app never flashes a login screen at
 * a user who is already signed in.
 */
export const App = () => {
  /**
   * Load the saved query cache before anything renders.
   *
   * In the render body rather than an effect on purpose: effects run *after* the
   * first paint, so restoring there would show an empty Home for one frame and
   * then fill it — the flash this exists to remove. MMKV is synchronous, so the
   * data is simply there by the time children render, the same reason the theme
   * is read during render. The function guards itself, so a re-render does no work.
   */
  hydrateQueryCache()

  useEffect(() => {
    void initCrashReporting()
    void initAnalytics()
    // Interaction signals older than a day carry no weight in scoring, so drop
    // them once per launch — otherwise the store grows for the life of the
    // install. Reading the clock in an effect is fine; it is not render.
    //
    // Imported from `logic/signalsStore` directly rather than through the
    // `@/features/tasks` barrel. The barrel exports four screens, and one of them
    // reaches SwipeableTaskRow → react-native-reanimated, so a single import for
    // one pure function was evaluating the whole tasks feature — and initialising
    // Reanimated — during the login screen's first render. `startupGraph.test.ts`
    // holds the line.
    pruneSignals(Date.now())
    // Log-only: proves whether the device can reach Base44 at all, before any
    // sign-in attempt muddies the picture.
    void runBackendPreflight()
  }, [])

  /**
   * Refetch stale data when the app comes back to the front.
   *
   * Separate from the effect above because it has a teardown, and because that one
   * deliberately runs once for its side effects only.
   */
  useEffect(() => startFocusBridge(), [])

  /** Mirror cache changes to disk, so the next launch starts where this one left off. */
  useEffect(() => startCachePersistence(), [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ThemedStatusBar />
              <RootNavigator />
              <Toast />
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
