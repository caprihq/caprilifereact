/**
 * Public surface of the auth feature.
 *
 * Anything not listed here is internal. Other features import from '@/features/auth'
 * only — never from its screens, services or logic directly.
 */
export { AuthProvider, useAuth } from './model/AuthContext'
export { LoginScreen } from './screens/LoginScreen'
export { EmailSignInScreen } from './screens/EmailSignInScreen'
export { EmailSignUpScreen } from './screens/EmailSignUpScreen'
export { EmailOtpScreen } from './screens/EmailOtpScreen'
export { ResetPasswordScreen } from './screens/ResetPasswordScreen'
export { ChangePasswordScreen } from './screens/ChangePasswordScreen'
