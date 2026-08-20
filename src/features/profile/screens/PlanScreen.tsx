import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { ScrollView, StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { purchaseProduct, restorePurchases } from '@/services/native'
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
        show({ message: 'Your plan is up to date.' })
      } catch (error) {
        // Cancelling a purchase throws too, which is not an error worth alarm.
        const message = error instanceof Error ? error.message : 'Purchase did not complete.'
        show({ message, isError: true })
      } finally {
        setBusy(null)
      }
    },
    [refreshPlan, show],
  )

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.lg }]}
    >
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
      </View>

      <Text variant="caption" tone="muted" align="center">
        Subscriptions renew automatically and can be cancelled in your Apple ID settings.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
