import { useCallback, useMemo, useState } from 'react'
import { size } from '@/theme'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { LoadingView } from '@/components/LoadingView'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useHardwareBack } from '@/hooks/useHardwareBack'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { useAuth } from '@/features/auth'
import { usePlan } from '@/hooks/usePlan'
import { clearSignals } from '@/features/tasks'
import type { AppNavigation, AppTabNavigation } from '@/navigation/types'
import { CalendarIntegrationsSection } from '@/features/commitments'
import { OnboardingSheet, useOnboarding } from '@/features/onboarding'
import { useUserProfile } from '../services/useUserProfile'
import type { EditableProfile } from '../services/useUserProfile'
import { ProfileIdentity } from '../components/ProfileIdentity'
import { ProfileSettingsList } from '../components/ProfileSettingsList'

/** Account, preferences, appearance, notifications, plan and support. */
export const ProfileScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const onboarding = useOnboarding()
  // The same navigator object, typed as the tabs: switching tab is not a stack push.
  const tabs = useNavigation<AppTabNavigation>()

  // Back from a second tab returns to the first, rather than leaving the app —
  // the tabs are native, so this is not handled for us.
  useHardwareBack(
    useCallback(() => {
      tabs.navigate('Home')
      return true
    }, [tabs]),
  )
  const { show } = useFeedback()
  const { signOut } = useAuth()
  const { user, isLoading, update } = useUserProfile()
  const { planLabel, isPaid } = usePlan()
  const [signingOut, setSigningOut] = useState(false)

  const save = useCallback(
    (changes: Partial<EditableProfile>) => {
      void update(changes).then((ok) => {
        if (!ok) show({ message: "Couldn't save that change.", tone: 'error' })
      })
    },
    [update, show],
  )

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    // The next account must not inherit this one's ranking history.
    clearSignals()
    await signOut()
  }, [signOut])

  const routes = useMemo(
    () => ({
      onPlan: () => navigation.navigate('Plan'),
      onSupport: () => navigation.navigate('Support'),
      onPrivacy: () => navigation.navigate('Privacy'),
      onAdmin: () => navigation.navigate('Admin'),
      onChangePassword: () => navigation.navigate('ChangePassword'),
      onRestartSetup: onboarding.restart,
    }),
    [navigation, onboarding.restart],
  )

  if (isLoading) return <LoadingView />

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.fill, wash]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: size.screenPadding,
          paddingBottom: theme.spacing.xxxl * 2,
          gap: theme.spacing.lg,
        }}
      >
        <ProfileIdentity user={user} onRename={(display_name) => save({ display_name })} />

        <ProfileSettingsList
          user={user}
          planLabel={planLabel}
          isPaid={isPaid}
          onChange={save}
          routes={routes}
        />

        <CalendarIntegrationsSection onUpgrade={routes.onPlan} />

        <OnboardingSheet {...onboarding} onFinish={(answers) => void onboarding.finish(answers)} />

        <View style={{ marginTop: theme.spacing.xl }}>
          <Button
            label="Sign out"
            variant="secondary"
            onPress={() => void handleSignOut()}
            loading={signingOut}
          />
        </View>

        <Text variant="caption" tone="muted" align="center">
          CAPRI for Life
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
