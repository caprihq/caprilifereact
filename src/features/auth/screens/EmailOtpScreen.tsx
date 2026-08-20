import { StyleSheet, View } from 'react-native'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { AuthStackParamList } from '@/navigation/types'
import { fontSize, letterSpacing, size } from '@/theme'
import { EXPECTED_CODE_LENGTH } from '../logic/otpPolicy'
import { useOtpVerification } from '../hooks/useOtpVerification'
import { AuthFormLayout } from '../components/AuthFormLayout'

/**
 * Email verification. Base44 sends a code when an address is unverified.
 *
 * Two things the first version left out produced the same behaviour — a user
 * tapping Resend repeatedly until Base44 answered 429: the expiry Base44 reports
 * was discarded, so no deadline was shown, and Resend had no cooldown, so
 * nothing acknowledged the tap. Both now come from `useOtpVerification`.
 */
export const EmailOtpScreen = () => {
  const theme = useTheme()
  const route = useRoute<RouteProp<AuthStackParamList, 'EmailOtp'>>()
  const { email, expiresInMinutes, needsCode } = route.params
  const otp = useOtpVerification(email, expiresInMinutes, needsCode)

  return (
    <AuthFormLayout align="top">
      <Text variant="title">Check your email</Text>
      <Text
        variant="body"
        tone="secondary"
        style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.lg }}
      >
        We sent a {EXPECTED_CODE_LENGTH}-digit code to {email}.
      </Text>

      <TextField
        label="Verification code"
        placeholder="000000"
        value={otp.code}
        // Normalised centrally, so a pasted "123 456" still works.
        onChangeText={otp.onChangeCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        style={styles.codeInput}
      />

      {otp.countdown ? (
        <Text variant="caption" tone="muted" align="center" style={{ marginTop: theme.spacing.md }}>
          This code expires in {otp.countdown}
        </Text>
      ) : null}

      <FormError message={otp.expired ? 'That code has expired. Request a new one.' : otp.error} />
      <FormError message={otp.notice} tone="notice" />

      <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
        <Button
          label="Verify"
          onPress={() => void otp.submit()}
          loading={otp.busy}
          disabled={!otp.canSubmit}
        />
        <Button
          label={otp.resendLabel}
          variant="ghost"
          onPress={() => void otp.resend()}
          // Expiry does not block a resend — that is the way out of it.
          disabled={!otp.resendReady || otp.busy}
        />
      </View>
    </AuthFormLayout>
  )
}

const styles = StyleSheet.create({
  codeInput: {
    height: size.codeInput,
    fontSize: fontSize.xxl,
    letterSpacing: letterSpacing.code,
    textAlign: 'center',
  },
})
