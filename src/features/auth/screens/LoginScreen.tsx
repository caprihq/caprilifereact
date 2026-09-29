import { Linking, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { FormError } from '@/components/FormError/FormError'
import { MoodBackground } from '@/components/MoodBackground'
import { Text } from '@/components/Text'
import { useConfirmExit } from '@/hooks/useHardwareBack'
import { useTheme } from '@/hooks/useTheme'
import { size } from '@/theme'

/**
 * Apple's standard EULA, which is what the App Store shows for CAPRI.
 *
 * Stays an outbound link because it is Apple's document, not ours — there is
 * nothing to render natively and no version of it we control.
 */
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
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

      <LegalLinks />
      </SafeAreaView>
    </MoodBackground>
  )
}

/**
 * Terms and Privacy, before anyone signs in.
 *
 * App Review expects both to be reachable from the point an account is created, and
 * the line here said "By continuing you agree to CAPRI's terms" with nothing to tap —
 * an agreement to something the user had no way to read.
 *
 * They go to different places for a reason. Terms is Apple's EULA, which only exists
 * on Apple's site. Privacy is ours, and opens the app's own screen: it used to load
 * the Base44 web app's page, which made the new app depend on the one it replaces —
 * a link that dies the day that project is renamed or retired, and a dead privacy
 * link is an App Store failure rather than a cosmetic one. The native screen also
 * says more, because it is written about this app: the device identifier kept for
 * push, calendar times read without titles, what reaches the AI provider.
 */
const LegalLinks = () => {
  const theme = useTheme()
  const navigation = useNavigation<AuthNavigation>()

  return (
    <View style={[styles.terms, { gap: theme.spacing.xs }]}>
      <Text variant="caption" tone="muted" align="center">
        By continuing you agree to
      </Text>
      <View style={[styles.links, { gap: theme.spacing.lg }]}>
        <Text
          variant="caption"
          tone="accent"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(TERMS_URL)}
        >
          Terms of Use
        </Text>
        <Text
          variant="caption"
          tone="accent"
          accessibilityRole="link"
          onPress={() => { navigation.navigate('Privacy') }}
        >
          Privacy Policy
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  links: { flexDirection: 'row', justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: size.screenPadding },
  terms: { paddingHorizontal: size.screenPadding, paddingBottom: size.screenPadding },
})
