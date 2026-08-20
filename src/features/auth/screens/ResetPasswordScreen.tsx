import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { AuthNavigation } from '@/navigation/types'
import { useCompleteReset } from '../hooks/useCompleteReset'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Set a new password from the token in the reset email.
 *
 * This screen is what turned "Forgot password" from a dead end into a flow:
 * `resetPassword` existed in the SDK with nothing calling it, so a user could
 * request the email and then had nowhere to go.
 *
 * Native by requirement — the token is consumed in the app and the user never
 * leaves it.
 *
 * On success it routes to sign-in rather than logging straight in: Base44
 * returns no session from a reset, and asking someone to use the password they
 * just chose confirms it works.
 */
export const ResetPasswordScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation<AuthNavigation>()
  const form = useCompleteReset(() => navigation.navigate('EmailSignIn'))

  return (
    <AuthFormLayout>
      <Text variant="title">Choose a new password</Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xxl }}
      >
        Paste the link from the reset email, then choose a new password.
      </Text>

      <TextField
        label="Reset link or code"
        showLabel
        icon="link-outline"
        placeholder="https://…?token=… or the code itself"
        value={form.link}
        onChangeText={form.setLink}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        autoFocus
      />

      <View style={{ height: theme.spacing.lg }} />

      <TextField
        label="New password"
        showLabel
        icon="lock-closed-outline"
        placeholder="••••••••"
        value={form.password}
        onChangeText={form.setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
      />

      <View style={{ marginTop: theme.spacing.lg }}>
        <TextField
          label="Confirm new password"
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
        <Button label="Set new password" onPress={() => void form.submit()} loading={form.busy} />
        <Button
          label="Back to sign in"
          variant="ghost"
          onPress={() => navigation.navigate('EmailSignIn')}
          disabled={form.busy}
        />
      </View>
    </AuthFormLayout>
  )
}
