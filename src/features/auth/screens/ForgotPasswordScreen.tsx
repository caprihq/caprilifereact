import { useState } from 'react'
import { View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { AuthNavigation, AuthStackParamList } from '@/navigation/types'
import { usePasswordReset } from '../hooks/usePasswordReset'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Forgot password: ask for the address, then say what happens next.
 *
 * A screen of its own because the previous version fired the request straight from
 * the sign-in form and read whatever was in the email field — so tapping "Forgot
 * password?" with an empty field produced a validation error instead of a way
 * forward, and with a *wrong* address it silently mailed the wrong person.
 *
 * **The confirmation does not hedge, on purpose.** Base44 cannot tell us whether the
 * address is registered — `/auth/reset-password-request` answers `200 {"message":"If
 * an account exists with this email…"}` for a real address and a made-up one alike,
 * verified against the live endpoint — but repeating that conditional on screen made
 * the app look like it did not know what it had just done. So the screen states the
 * next step plainly and puts the uncertainty where it is actionable: check spam, or
 * send it again. The only case this overstates is an address with no account, where
 * no mail arrives; the advice below covers that without accusing the user of
 * mistyping.
 */
/** What to do next, once the request has gone through. */
const SentConfirmation = ({ email, onBack }: { readonly email: string; readonly onBack: () => void }) => {
  const theme = useTheme()

  return (
    <AuthFormLayout>
      <Text variant="title">Check your email</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
        We sent a reset link to {email}. Open it to choose a new password, then sign in with it.
      </Text>
      <Text
        variant="caption"
        tone="muted"
        style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xxl }}
      >
        Nothing after a minute? Check spam, or send it again.
      </Text>

      <View style={{ gap: theme.spacing.md }}>
        <Button label="Back to sign in" onPress={onBack} />
      </View>
    </AuthFormLayout>
  )
}

export const ForgotPasswordScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation<AuthNavigation>()
  const route = useRoute<RouteProp<AuthStackParamList, 'ForgotPassword'>>()
  const reset = usePasswordReset()

  // Carried over from the sign-in form, so nobody types their address twice.
  const [email, setEmail] = useState(route.params?.email ?? '')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const send = () => {
    void reset.request(email).then((outcome) => {
      if (outcome.kind === 'sent') setSentTo(outcome.email)
    })
  }

  if (sentTo !== null) {
    return (
      <SentConfirmation email={sentTo} onBack={() => navigation.navigate('EmailSignIn')} />
    )
  }

  return (
    <AuthFormLayout>
      <Text variant="title">Forgot password</Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.xxl }}
      >
        Enter your email address and we will send you a link to set a new password.
      </Text>

      <TextField
        label="Email"
        showLabel
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="go"
        onSubmitEditing={send}
        autoFocus
      />

      <FormError message={reset.error} />

      <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
        <Button label="Send reset link" onPress={send} loading={reset.busy} />
        <Button
          label="Back to sign in"
          variant="ghost"
          onPress={() => navigation.goBack()}
          disabled={reset.busy}
        />
      </View>
    </AuthFormLayout>
  )
}
