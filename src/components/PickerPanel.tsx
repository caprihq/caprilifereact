import { Pressable, StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'
import { size } from '@/theme'

/**
 * The frame around an inline iOS date or time picker: a way out, and a way to agree.
 *
 * Two faults it exists to fix, both from the picker being left bare.
 *
 * **Confirming.** The platform picker reports a *change*, so tapping the date it
 * already shows emits nothing. Opening "Due date" on a task with none starts the
 * calendar on today — and tapping today did nothing at all, so setting a task as due
 * today meant choosing another day and coming back to it. A confirm button commits
 * whatever is highlighted, changed or not.
 *
 * **Leaving.** An inline picker has no dismiss of its own. Opening one by mistake
 * left the only way out as tapping the row again, which is not discoverable — so
 * there is a close control, and it discards rather than commits.
 *
 * Android is not wrapped in this: its picker is a system dialog that brings its own
 * OK and Cancel, and a second set underneath would be two of everything.
 */

type PickerPanelProps = {
  readonly title: string
  /** Dismiss without committing. */
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly children: ReactNode
  /** Optional extra control below the picker, such as "Clear due date". */
  readonly footer?: ReactNode
}

export const PickerPanel = ({
  title,
  onCancel,
  onConfirm,
  children,
  footer,
}: PickerPanelProps) => {
  const theme = useTheme()

  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      <View style={[styles.header, { paddingVertical: theme.spacing.xs }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${title.toLowerCase()}`}
          onPress={onCancel}
          hitSlop={theme.spacing.md}
          style={({ pressed }) => [styles.close, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
        </Pressable>

        <Text variant="label" tone="secondary">
          {title}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Confirm ${title.toLowerCase()}`}
          onPress={onConfirm}
          hitSlop={theme.spacing.md}
          style={({ pressed }) => [styles.confirm, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Text variant="label" tone="accent">
            Confirm
          </Text>
        </Pressable>
      </View>

      {children}
      {footer}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { minWidth: size.tapTarget, justifyContent: 'center' },
  confirm: { minWidth: size.tapTarget, alignItems: 'flex-end', justifyContent: 'center' },
})
