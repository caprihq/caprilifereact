import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { MoodBackground } from '@/components/MoodBackground'
import { Text } from '@/components/Text'
import { useConfirmExit } from '@/hooks/useHardwareBack'
import { useTheme } from '@/hooks/useTheme'
import { size } from '@/theme'
import type { AuthNavigation } from '@/navigation/types'
import { useAuth } from '../model/AuthContext'
import { useProviderSignIn } from '../hooks/useProviderSignIn'
import { AuthBrand } from '../components/AuthBrand'
import { AuthDivider } from '../components/AuthDivider'
import { ProviderButton } from '../components/ProviderButton'

/**
 * Sign-in entry point: Google, Apple, or email.
 *
 * Email is a native form all the way through. Google and Apple open a system auth
 * sheet, because Base44 offers no other route — its SSO module only *retrieves*
 * tokens for existing users, so there is no endpoint to exchange a native Google
 * or Apple credential for a session. See `services/oauth.ts`.
 */
export const LoginScreen = () => {
  const theme = useTheme()
  // The signed-out root: back here closes the app too, so it asks the same way.
  useConfirmExit()
  const navigation = useNavigation<AuthNavigation>()
  const { errorMessage } = useAuth()
  const provider = useProviderSignIn()

  return (
    <MoodBackground>
      <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <AuthBrand />

        <View style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.md }}>
          <ProviderButton
            provider="google"
            onPress={() => void provider.start('google')}
            loading={provider.running === 'google'}
            disabled={provider.busy}
          />
          <ProviderButton
            provider="apple"
            onPress={() => void provider.start('apple')}
            loading={provider.running === 'apple'}
            disabled={provider.busy}
          />

          <View style={{ marginVertical: theme.spacing.sm }}>
            <AuthDivider />
          </View>

          <Button
            label="Sign in with email"
            onPress={() => navigation.navigate('EmailSignIn')}
            disabled={provider.busy}
          />
          <Button
            label="Create an account"
            variant="ghost"
            onPress={() => navigation.navigate('EmailSignUp')}
            disabled={provider.busy}
          />
        </View>

        <FormError message={errorMessage ?? provider.error} />
      </View>

      <Text variant="caption" tone="muted" align="center" style={styles.terms}>
        By continuing you agree to CAPRI&apos;s terms.
        </Text>
      </SafeAreaView>
    </MoodBackground>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: size.screenPadding },
  terms: { paddingHorizontal: size.screenPadding, paddingBottom: size.screenPadding },
})
