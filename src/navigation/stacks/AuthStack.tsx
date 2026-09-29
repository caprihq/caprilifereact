import { createNativeStackNavigator } from '@react-navigation/native-stack'

import {
  EmailOtpScreen,
  EmailSignInScreen,
  EmailSignUpScreen,
  LoginScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from '@/features/auth'
// Deep import, not the feature barrel: `@/features/profile` re-exports ProfileScreen,
// which reaches the task screens, and pulling those in to draw a login screen is the
// cold-start regression `startupGraph.test.ts` exists to catch.
import { PrivacyScreen } from '@/features/profile/screens/PrivacyScreen'
import { useTheme } from '@/hooks/useTheme'
import { buildHeaderOptions } from '../navigationTheme'
import { gestureOptions, pushAnimation } from '../screenOptions'
import type { AuthStackParamList } from '../types'

const Stack = createNativeStackNavigator<AuthStackParamList>()

/**
 * Signed-out stack.
 *
 * native-stack renders a real UINavigationController, so the back swipe and the
 * push animation are the platform's rather than a JS reimplementation.
 *
 * Screens are registered with `component` rather than render-prop children:
 * render props erase the param-list types down to `any`.
 */
export const AuthStack = () => {
  const theme = useTheme()

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        ...gestureOptions,
        ...pushAnimation,
        ...buildHeaderOptions(theme),
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* Shared with the signed-in stack rather than duplicated: one policy, one
          copy of the words, no way for the two to drift apart. */}
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ headerShown: true, title: 'Privacy', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="EmailSignIn"
        component={EmailSignInScreen}
        options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="EmailSignUp"
        component={EmailSignUpScreen}
        options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="EmailOtp"
        component={EmailOtpScreen}
        options={{ headerShown: true, title: '', headerBackTitle: 'Back' }}
      />
    </Stack.Navigator>
  )
}
