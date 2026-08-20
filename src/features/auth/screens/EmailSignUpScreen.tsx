import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { useEmailSignUp } from '../hooks/useEmailSignUp'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Create an account with an email and password.
 *
 * This screen was missing entirely: `registerWithEmail` was written but nothing
 * called it, so a new user could not sign up inside the app at all. The web
 * client got registration for free because its single "Sign in" button opened
 * Base44's hosted page; the native port replaced that with provider buttons and
 * dropped the path.
 *
 * Layout only. The form's state, and the fact that registration now sends the
 * app's own verification code, live in `useEmailSignUp`.
 */
export const EmailSignUpScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation()
  const form = useEmailSignUp()

  return (
    <AuthFormLayout align="top">
      <Text variant="title" style={{ marginBottom: theme.spacing.xxl }}>
        Create your account
      </Text>

      {/* One wrapper with `gap`, not per-field margins. `style` on TextField reaches
          the TextInput *inside* the bordered shell, so a marginTop there padded the
          input within its own box and left the boxes touching — which is what made
          this screen look cramped. */}
      <View style={{ gap: theme.spacing.lg }}>
        <TextField
          label="Email"
          showLabel
          icon="mail-outline"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={form.setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
        />

        <TextField
          label="Password"
          showLabel
          icon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={form.password}
          onChangeText={form.setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />

        <TextField
          label="Confirm password"
          showLabel
          icon="lock-closed-outline"
          placeholder="••••••••"
          value={form.confirm}
          onChangeText={form.setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void form.submit()}
        />
      </View>

      <FormError message={form.error} />

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <Button label="Create account" onPress={() => void form.submit()} loading={form.busy} />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => navigation.goBack()}
          disabled={form.busy}
        />
      </View>
    </AuthFormLayout>
  )
}
