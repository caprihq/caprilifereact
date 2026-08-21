import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Suspense, lazy, useEffect } from 'react'
import BootSplash from 'react-native-bootsplash'

import { ErrorView } from '@/components/ErrorView'
import { LoadingView } from '@/components/LoadingView'
import { useAuth } from '@/features/auth'
import { useTheme } from '@/hooks/useTheme'
import { linking } from './linking'
import { buildNavigationTheme } from './navigationTheme'
import { AuthStack } from './stacks/AuthStack'
import type { RootStackParamList } from './types'
import { logWarn } from '@/utils'

const Stack = createNativeStackNavigator<RootStackParamList>()

/**
 * The signed-in half of the app, loaded only once someone is signed in.
 *
 * A static import here made every signed-out launch evaluate all of it — the
 * tabs, every task, planner and profile screen, and through `SwipeableTaskRow`
 * **react-native-reanimated**, which installs a Fabric commit hook and registers
 * a `MountingOverrideDelegate` on the shadow tree. That put a third-party object
 * inside the mount path of the login screen's very first commit, which is where
 * the intermittent `pullTransaction` crash was happening.
 *
 * A signed-out user cannot reach any of it, so none of it needs to exist yet.
 * `startupGraph.test.ts` keeps it that way.
 */
const AppStack = lazy(async () => {
  const stack = await import('./stacks/AppStack')
  return { default: stack.AppStack }
})

/**
 * Routes on session state.
 *
 * Auth and App are separate stacks rather than screens in one, so signing out
 * cannot leave an authenticated screen underneath in the history — and the
 * transition between them is a real native animation, not a remount flash.
 *
 * The container theme comes from Unistyles, so the surface *behind* screens
 * matches the app. Left at the default it is white, and every push in dark mode
 * flashes white for the length of the transition.
 */
export const RootNavigator = () => {
  const { status, errorMessage, retry } = useAuth()
  const theme = useTheme()

  // Hold the native splash until the session question is answered, so the app
  // never flashes a login screen at a user who is already signed in.
  useEffect(() => {
    if (status === 'restoring') return
    // Never leave this rejection unhandled: a missing native splash setup
    // would otherwise surface as an opaque crash on launch.
    BootSplash.hide({ fade: true }).catch((error: unknown) => {
      logWarn('[splash] hide failed', error)
    })
  }, [status])

  if (status === 'restoring') return <LoadingView />

  if (status === 'error') {
    return (
      <ErrorView
        title="Can't reach CAPRI"
        message={errorMessage ?? 'Check your connection and try again.'}
        onRetry={() => void retry()}
      />
    )
  }

  return (
    <NavigationContainer theme={buildNavigationTheme(theme)} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {status === 'authenticated' ? (
          <Stack.Screen name="App">
            {/* The fallback is near-instantaneous — Metro resolves the chunk
                locally — but it must exist, and it must match the app's
                background so signing in does not flash. */}
            {() => (
              <Suspense fallback={<LoadingView />}>
                <AppStack />
              </Suspense>
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
