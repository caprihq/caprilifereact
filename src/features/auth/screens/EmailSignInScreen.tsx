import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { AuthNavigation } from '@/navigation/types'
import { useEmailSignIn } from '../hooks/useEmailSignIn'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Native email + password sign-in.
 *
 * Base44 exposes `loginViaEmailPassword` as a direct API call, so this is a real
 * form rather than a browser handoff.
 *
 * It also carries the routes to account creation and password reset, neither of
 * which existed before — the port had no way to sign up at all.
 *
 * Layout only; the flow lives in `useEmailSignIn`.
 */
export const EmailSignInScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation<AuthNavigation>()
  const form = useEmailSignIn()
  const { reset } = form

  return (
    <AuthFormLayout>
      <Text variant="title" style={{ marginBottom: theme.spacing.xxl }}>
        Sign in
      </Text>

      <TextField
        label="Email"
        showLabel
        icon="mail-outline"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={(next) => {
          form.setEmail(next)
          // A message about the old address is misleading once it changes.
          reset.clear()
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
      />

      <View style={{ marginTop: theme.spacing.lg }}>
        <TextField
          label="Password"
          showLabel
          icon="lock-closed-outline"
          placeholder="••••••••"
          value={form.password}
          onChangeText={form.setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void form.submit()}
        />
      </View>

      <FormError message={form.error ?? reset.error} />

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <Button
          label="Sign in"
          onPress={() => void form.submit()}
          loading={form.busy}
          disabled={!form.canSubmit}
        />
        <Button
          label="Create an account"
          variant="secondary"
          onPress={() => navigation.navigate('EmailSignUp')}
          disabled={form.busy}
        />
        <Button
          label="Forgot password?"
          variant="ghost"
          onPress={() => void reset.request(form.email)}
          loading={reset.busy}
          disabled={form.busy || reset.busy}
        />
        {/* The other half of the reset: the email's link opens Base44's own web
            page, so the token has to be brought back in by hand. Without this the
            request was a dead end — the mail arrived and the app had no way to
            use it. */}
        <Button
          label="I have a reset link"
          variant="ghost"
          onPress={() => navigation.navigate('ResetPassword')}
          disabled={form.busy || reset.busy}
        />
      </View>
    </AuthFormLayout>
  )
}
