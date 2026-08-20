import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'

import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { ThemedStatusBar } from '@/components/ThemedStatusBar/ThemedStatusBar'
import { Toast } from '@/components/Toast/Toast'
import { AuthProvider } from '@/features/auth'
import { runBackendPreflight } from '@/features/auth/services/backendPreflight'
import { pruneSignals } from '@/features/tasks/logic/signalsStore'
import { RootNavigator } from '@/navigation'
import { initCrashReporting } from '@/services'
import { queryClient } from '@/services/api'

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
  useEffect(() => {
    void initCrashReporting()
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
