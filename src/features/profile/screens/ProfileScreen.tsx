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
import { useContentBottom } from '@/hooks/useContentBottom'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useAuth } from '@/features/auth'
import { useDeleteAccount } from '../services/useDeleteAccount'
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
  const contentBottom = useContentBottom(true)
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
  const account = useAccountExit()
  const { user, isLoading, update } = useUserProfile()
  const { planLabel, isPaid } = usePlan()

  const save = useCallback(
    (changes: Partial<EditableProfile>) => {
      void update(changes).then((ok) => {
        if (!ok) show({ message: "Couldn't save that change.", tone: 'error' })
      })
    },
    [update, show],
  )

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
          // Clears the translucent native tab bar and the home indicator.
          paddingBottom: contentBottom,
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

        <AccountActions {...account} />

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

/**
 * Signing out and deleting: the two ways to leave, and the state each needs.
 *
 * Together in one hook because the screen body is a list of sections, and threading
 * five pieces of exit state through it buries that.
 */
const useAccountExit = () => {
  const { signOut } = useAuth()
  const { deleteAccount, deleting } = useDeleteAccount()
  const [signingOut, setSigningOut] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const onSignOut = useCallback(() => {
    setSigningOut(true)
    // The next account must not inherit this one's ranking history.
    clearSignals()
    void signOut()
  }, [signOut])

  return {
    signingOut,
    deleting,
    confirming,
    onSignOut,
    onAskDelete: useCallback(() => {
      setConfirming(true)
    }, []),
    onConfirmDelete: useCallback(() => {
      setConfirming(false)
      void deleteAccount()
    }, [deleteAccount]),
    onCancelDelete: useCallback(() => {
      setConfirming(false)
    }, []),
  }
}

/**
 * Leaving, in both senses.
 *
 * Delete is outlined rather than filled: it should be findable and unmistakable
 * without being the brightest thing on a settings screen. The confirmation names
 * what it destroys rather than asking "are you sure", because "are you sure" is a
 * question people answer without reading.
 */
const AccountActions = ({
  signingOut,
  deleting,
  confirming,
  onSignOut,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  readonly signingOut: boolean
  readonly deleting: boolean
  readonly confirming: boolean
  readonly onSignOut: () => void
  readonly onAskDelete: () => void
  readonly onConfirmDelete: () => void
  readonly onCancelDelete: () => void
}) => {
  const theme = useTheme()

  return (
    <>
      <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.md }}>
        <Button label="Sign out" variant="secondary" onPress={onSignOut} loading={signingOut} />

        {/* Required in-app by the App Store, and right regardless: asking support to
            delete your data is asking permission to leave. */}
        <Button label="Delete account" variant="danger" onPress={onAskDelete} loading={deleting} />
      </View>

      <ConfirmDialog
        open={confirming}
        title="Delete your account?"
        message="Every task, commitment and setting is removed permanently. This cannot be undone."
        confirmLabel="Delete everything"
        icon="trash-outline"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </>
  )
}
