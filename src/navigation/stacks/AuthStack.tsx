import { createNativeStackNavigator } from '@react-navigation/native-stack'

import {
  EmailOtpScreen,
  EmailSignInScreen,
  EmailSignUpScreen,
  LoginScreen,
  ResetPasswordScreen,
} from '@/features/auth'
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
