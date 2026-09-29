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
import { track } from '@/services'
import { priceLabelFor } from '../logic/planPricing'
import { useStoreProducts } from '../services/useStoreProducts'
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

/**
 * Apple's standard licence, which applies unless an app supplies its own.
 *
 * A subscription screen has to link both this and a privacy policy, and the links
 * have to work. Privacy is a screen in the app; terms are a document we do not have,
 * so this is the correct one to point at until there is a bespoke EULA.
 */
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'

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
  const products = useStoreProducts()

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

      <CurrentPlan label={planLabel} />

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
                // The price comes from the store, already in the right currency.
                label={priceLabelFor(product, products)}
                onPress={() =>
                  void run(product.id, async () => {
                    const result = await purchaseProduct(product.id)
                    // After the await, so a cancelled or failed purchase is not
                    // counted as one — the number is meaningless otherwise.
                    track({ name: 'upgrade_purchased', params: { product: product.id } })
                    return result
                  })
                }
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

      <LegalLinks onPrivacy={() => navigation.navigate('Privacy')} />
    </ScrollView>
  )
}

/** What the account is on today. */
const CurrentPlan = ({ label }: { readonly label: string }) => {
  const theme = useTheme()

  return (
    <Card>
      <Text variant="label" tone="secondary">
        Current plan
      </Text>
      <Text variant="title" style={{ marginTop: theme.spacing.xs }}>
        {label}
      </Text>
    </Card>
  )
}

/**
 * Terms and privacy, which a subscription screen has to carry — and the links have
 * to work, not merely exist.
 */
const LegalLinks = ({ onPrivacy }: { readonly onPrivacy: () => void }) => {
  const theme = useTheme()

  return (
    <View style={[styles.legal, { gap: theme.spacing.lg }]}>
      <Text
        variant="caption"
        tone="accent"
        accessibilityRole="link"
        onPress={() => void Linking.openURL(TERMS_URL)}
      >
        Terms of Use
      </Text>
      <Text variant="caption" tone="accent" accessibilityRole="link" onPress={onPrivacy}>
        Privacy Policy
      </Text>
    </View>
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
  legal: { flexDirection: 'row', justifyContent: 'center' },
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
