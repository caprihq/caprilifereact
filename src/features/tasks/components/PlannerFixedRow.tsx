import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TimelineItem } from '@/features/commitments'

/**
 * A commitment, scheduled event or calendar meeting inside a planner block.
 *
 * Shaped like `PlannerTaskRow` so a block reads as one list, but quieter and without
 * the two task actions: nobody "completes" a meeting, and taking it "off today"
 * would mean deleting someone's real appointment. A border instead of a filled
 * surface marks it as time that is spoken for rather than work to do.
 *
 * Only a scheduled-event task opens on tap, because it is the only kind with a
 * detail screen; commitments and Google events have none.
 */

type PlannerFixedRowProps = {
  readonly item: TimelineItem
  readonly onOpenTask?: (() => void) | undefined
}

export const PlannerFixedRow = ({ item, onOpenTask }: PlannerFixedRowProps) => {
  const theme = useTheme()
  const opens = item.source === 'task' && !!onOpenTask
  const detail = [item.timeLabel, item.location].filter(Boolean).join(' · ')

  return (
    <Pressable
      accessibilityRole={opens ? 'button' : 'text'}
      accessibilityLabel={detail ? `${item.title}, ${detail}` : item.title}
      disabled={!opens}
      onPress={onOpenTask}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons
        name={item.source === 'calendar' ? 'calendar-outline' : 'calendar-number-outline'}
        size={18}
        color={item.source === 'calendar' ? theme.colors.accentInk : theme.colors.textSecondary}
      />

      <View style={styles.body}>
        <Text variant="body" numberOfLines={1}>
          {item.title}
        </Text>
        {detail ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>

      {opens ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  body: { flex: 1 },
})
