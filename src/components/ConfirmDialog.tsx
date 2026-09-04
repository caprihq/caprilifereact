import { Modal, Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Button } from './Button'
import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * A confirmation the user can read before it happens.
 *
 * Built rather than using `Alert.alert` for one reason that matters: a system alert
 * is the platform's chrome, ignores the chosen mood entirely, and looks like an
 * error even when it is asking an ordinary question. This wears the app's own
 * surface, spacing and accent.
 *
 * Deliberately not a general-purpose dialog: it asks one question and offers two
 * answers, and the destructive one is named after what it does ("Complete",
 * "Delete") rather than "OK", so the button says what will happen.
 */

type ConfirmDialogProps = {
  readonly open: boolean
  readonly title: string
  readonly message?: string | undefined
  /** The affirmative action, named after what it does. */
  readonly confirmLabel: string
  readonly icon?: string | undefined
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  icon = 'help-circle-outline',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const theme = useTheme()

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Tapping outside cancels, which is what every dialog on both platforms does
          and what a user reaching for "no" tries first. */}
      {/* The backdrop is the layout: the card centres inside it, and a tap on the
          dimmed area cancels — what a user reaching for "no" tries first. */}
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel">
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
            <Ionicons name={icon} size={26} color={theme.colors.accentInk} />
          </View>

          <Text variant="bodyStrong" align="center">
            {title}
          </Text>

          {message ? (
            <Text variant="body" tone="secondary" align="center">
              {message}
            </Text>
          ) : null}

          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Button label={confirmLabel} onPress={onConfirm} />
            <Button label="Not yet" variant="ghost" onPress={onCancel} />
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
  glyph: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
})
