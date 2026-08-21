import { View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { AuthNavigation, AuthStackParamList } from '@/navigation/types'
import { useCompleteReset } from '../hooks/useCompleteReset'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Set a new password from the token in the reset email.
 *
 * Reached by **deep link, not by navigation** — tapping the emailed link on the phone
 * opens the app here with the token already in the route. Nothing in the app links to
 * this screen, which is why it has no "back to sign in" path other than finishing.
 *
 * On success it routes to sign-in rather than logging straight in: Base44 returns no
 * session from a reset, and using the new password once confirms it took.
 */
export const ResetPasswordScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation<AuthNavigation>()
  const route = useRoute<RouteProp<AuthStackParamList, 'ResetPassword'>>()
  const token = route.params?.token ?? ''
  const form = useCompleteReset(token, () => navigation.navigate('EmailSignIn'))

  // A link that arrives without a token is not recoverable here: only a fresh email
  // carries a new one, and pretending otherwise wastes the user's time on a form
  // that cannot succeed.
  if (!token) {
    return (
      <AuthFormLayout>
        <Text variant="title">Link incomplete</Text>
        <Text
          variant="body"
          tone="secondary"
          style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xxl }}
        >
          That link is missing its reset code. Request a new one and open the latest email.
        </Text>

        <Button
          label="Request a new link"
          onPress={() => navigation.navigate('ForgotPassword', undefined)}
        />
      </AuthFormLayout>
    )
  }

  return (
    <AuthFormLayout>
      <Text variant="title">Choose a new password</Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xxl }}
      >
        Then sign in with it.
      </Text>

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
        autoFocus
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

      <View style={{ marginTop: theme.spacing.xxl }}>
        <Button
          label="Set new password"
          onPress={() => void form.submit()}
          loading={form.busy}
        />
      </View>
    </AuthFormLayout>
  )
}
