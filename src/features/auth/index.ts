/**
 * Public surface of the auth feature.
 *
 * Anything not listed here is internal. Other features import from '@/features/auth'
 * only — never from its screens, services or logic directly.
 */
export { AuthProvider, useAuth } from './model/AuthContext'
/** Exported so the notifications setting can trigger the permission prompt. */
export { registerForPush } from './services/pushRegistration'
export { LoginScreen } from './screens/LoginScreen'
export { EmailSignInScreen } from './screens/EmailSignInScreen'
export { EmailSignUpScreen } from './screens/EmailSignUpScreen'
export { EmailOtpScreen } from './screens/EmailOtpScreen'
export { ForgotPasswordScreen } from './screens/ForgotPasswordScreen'
export { ResetPasswordScreen } from './screens/ResetPasswordScreen'
export { ChangePasswordScreen } from './screens/ChangePasswordScreen'
