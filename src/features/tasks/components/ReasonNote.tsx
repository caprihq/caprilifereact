import { StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * CAPRI's reasoning, in full, on the screen that has room for it.
 *
 * The reason exists to make a recommendation feel considered rather than arbitrary,
 * and that is worth a lot on the one card asking to be trusted. Repeated and clipped
 * to two lines down a list, it stops being an explanation and becomes texture: the
 * home screen read as busy because the same kind of sentence appeared four times with
 * none of them finishing.
 *
 * So it is clamped on Home and unclamped here, where the task is already the subject
 * of the screen. Previously detail had nowhere to live at all — the reason was shown
 * only on cards, truncated, and the full sentence could not be read anywhere.
 */
export const ReasonNote = ({ reason }: { readonly reason: string | undefined }) => {
  const theme = useTheme()
  if (!reason?.trim()) return null

  return (
    <View
      style={[
        styles.row,
        {
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.fill,
        },
      ]}
    >
      <Ionicons name="bulb-outline" size={16} color={theme.colors.accentInk} />
      <Text variant="caption" tone="secondary" style={styles.grow}>
        {reason}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
})
