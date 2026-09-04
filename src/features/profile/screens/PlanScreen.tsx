import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AppNavigation } from '@/navigation/types'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { SheetHeader } from '@/components/SheetHeader'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { purchaseProduct, restorePurchases } from '@/services/native'
import { reportError } from '@/services'
import { purchaseNotice } from '../logic/purchaseNotice'
import { usePlan } from '@/hooks/usePlan'

/**
 * Subscription management.
 *
 * Product ids match App Store Connect and RevenueCat exactly — the same
 * entitlement (`capri_executive`) the web client used, so an existing
 * subscriber is recognised rather than asked to pay twice.
 */

const PRODUCTS = [
  { id: 'capri_executive_monthly', label: 'Executive — Monthly' },
  { id: 'capri_executive_annual', label: 'Executive — Annual' },
] as const

const BENEFITS = [
  'Unlimited tasks',
  'Unlimited voice capture',
  'AI prioritisation and Up Next',
  'Smart auto-scheduling',
  'Subtasks and recurring tasks',
  'Calendar integration',
]

export const PlanScreen = () => {
  const theme = useTheme()
  const navigation = useNavigation<AppNavigation>()
  /**
   * This screen covers the status bar — it is pushed or presented full-screen, not
   * a sheet — and it draws its own header, so nothing else is insetting it. Without
   * this the close button sits under the clock.
   */
  const insets = useSafeAreaInsets()
  const wash = useWash()
  const { show } = useFeedback()
  const { planLabel, isPaid, refreshPlan } = usePlan()
  const [busy, setBusy] = useState<string | null>(null)

  const run = useCallback(
    async (key: string, action: () => Promise<{ plan: string }>) => {
      setBusy(key)
      try {
        await action()
        await refreshPlan()
        show({ message: 'Your plan is up to date.', tone: 'success' })
      } catch (error) {
        // Cancelling throws as well, and `purchaseNotice` answers that with null:
        // someone who tapped Cancel does not need to be told the purchase failed.
        reportError(error, 'purchase')
        const notice = purchaseNotice(error)
        if (notice) show(notice)
      } finally {
        setBusy(null)
      }
    },
    [refreshPlan, show],
  )

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.lg, paddingTop: insets.top + theme.spacing.md }]}
    >
      <SheetHeader title="Plan" onClose={() => navigation.goBack()} />

      <Card>
        <Text variant="label" tone="secondary">
          Current plan
        </Text>
        <Text variant="title" style={{ marginTop: theme.spacing.xs }}>
          {planLabel}
        </Text>
      </Card>

      {!isPaid ? (
        <Card>
          <Text variant="heading">CAPRI Executive Assistant</Text>
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs }}>
            {BENEFITS.map((benefit) => (
              <Text key={benefit} variant="body" tone="secondary">
                • {benefit}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        {!isPaid
          ? PRODUCTS.map((product) => (
              <Button
                key={product.id}
                label={product.label}
                onPress={() => void run(product.id, () => purchaseProduct(product.id))}
                loading={busy === product.id}
                disabled={busy !== null}
              />
            ))
          : null}

        <Button
          label="Restore purchases"
          variant="secondary"
          onPress={() => void run('restore', restorePurchases)}
          loading={busy === 'restore'}
          disabled={busy !== null}
        />

        {/* Cancelling is Apple's business, but finding the screen is not obvious —
            Settings › your name › Subscriptions is four taps from here and most
            people go looking in the app first. A subscription you cannot leave from
            inside the app is also a poor look at review time. */}
        <ManageSubscription visible={isPaid} disabled={busy !== null} />
      </View>

      <Text variant="caption" tone="muted" align="center">
        Subscriptions renew automatically and can be cancelled in your Apple ID settings.
      </Text>
    </ScrollView>
  )
}

/**
 * The way out of a subscription.
 *
 * Cancelling is Apple's business, but *finding* the screen is not obvious — it is
 * four taps deep in Settings and most people look in the app first. Shown only to
 * subscribers: offering "manage" to someone on the free plan is a dead end.
 */
const ManageSubscription = ({
  visible,
  disabled,
}: {
  readonly visible: boolean
  readonly disabled: boolean
}) =>
  visible ? (
    <Button
      label="Manage subscription"
      variant="ghost"
      onPress={() => void Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)}
      disabled={disabled}
    />
  ) : null


/**
 * Apple's subscription management screen.
 *
 * The documented deep link. It opens the App Store's subscriptions page directly,
 * rather than dropping the user at the root of Settings to find it themselves.
 */
const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions'

const styles = StyleSheet.create({
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
