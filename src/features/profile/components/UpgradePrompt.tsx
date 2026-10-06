import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { upgradeCopy } from '../logic/upgradeCopy'
import type { GatedFeature } from '../logic/upgradeCopy'

/**
 * The prompt shown when someone reaches a paid feature.
 *
 * It exists because sending every gate straight to the Plan screen answers a
 * question the user did not ask: they wanted subtasks, and got a price list. This
 * names the thing they reached for, states the free allowance where there is one,
 * and only then offers the upgrade.
 *
 * "Not now" is a real answer and sits next to the upgrade rather than hidden — a
 * prompt that traps you is one you learn to avoid triggering.
 */

/** Shaped to be spread from `useUpgradePrompt()`, so no call site rewires it. */
type UpgradePromptProps = {
  readonly feature: GatedFeature | null
  readonly upgrade: () => void
  readonly close: () => void
}

export const UpgradePrompt = ({ feature, upgrade, close }: UpgradePromptProps) => {
  const theme = useTheme()
  const copy = upgradeCopy(feature)

  return (
    <Modal visible={feature !== null} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Not now">
        <View style={styles.centre} pointerEvents="box-none">
          <View
            style={[
              styles.card,
              theme.elevation.high,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
                gap: theme.spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.glyph,
                { backgroundColor: theme.colors.fill, borderRadius: theme.radius.full },
              ]}
            >
              <Ionicons name={copy.icon} size={28} color={theme.colors.accentInk} />
            </View>

            <Text variant="bodyStrong" align="center">
              {copy.title}
            </Text>
            <Text variant="body" tone="secondary" align="center">
              {copy.description}
            </Text>

            {/*
              Full width, explicitly. The card centres its children, so this column
              was sized to its own content and each Button's `width: 100%` resolved
              against nothing — leaving both buttons at their natural widths, aligned
              left. "See Executive" is the wider of the two, so "Not now" sat off the
              card's centre line. Same fault, same fix, as ConfirmDialog.
            */}
            <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
              <Button label="See Executive" icon="sparkles" onPress={upgrade} />
              <Button label="Not now" variant="ghost" onPress={close} />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: size.screenPadding },
  card: { width: '100%', maxWidth: 340, alignItems: 'center' },
  glyph: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  actions: { width: '100%' },
})
