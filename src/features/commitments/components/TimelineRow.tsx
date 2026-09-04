import { Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TimelineItem } from '@/features/commitments/logic/timeline'

/**
 * One entry in Today's Commitments, whatever its source.
 *
 * The web client had two near-identical row components — CommitmentRow and
 * CalendarEventRow — differing only in icon colour and a location line. One
 * component covers both, since the merged item already carries everything.
 *
 * Calendar rows are read-only: they live in Google, not in CAPRI.
 */

type TimelineRowProps = {
  readonly item: TimelineItem
  readonly isLast: boolean
  readonly onPress?: (() => void) | undefined
  /** Removing a commitment. Never offered on a calendar row — see below. */
  readonly onLongPress?: (() => void) | undefined
}

export const TimelineRow = ({ item, isLast, onPress, onLongPress }: TimelineRowProps) => {
  const theme = useTheme()
  const interactive = !!onPress && item.source !== 'calendar'

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.md,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Ionicons
        name={item.source === 'calendar' ? 'calendar-outline' : 'calendar-number-outline'}
        size={18}
        color={item.source === 'calendar' ? theme.colors.accentInk : theme.colors.textSecondary}
      />

      <View style={styles.body}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {item.title}
        </Text>

        {item.timeLabel ? (
          <Text variant="caption" tone="muted">
            {item.timeLabel}
          </Text>
        ) : null}

        {item.location ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {item.location}
          </Text>
        ) : null}
      </View>

      {interactive ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      ) : null}
    </View>
  )

  if (!interactive) return content

  return (
    <Pressable
      onPress={onPress}
      // Only CAPRI's own rows: a calendar entry belongs to Google, and removing it
      // here would either fail or delete someone's real meeting.
      onLongPress={item.source === 'commitment' ? onLongPress : undefined}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityHint={item.source === 'commitment' ? 'Long press to remove' : undefined}
      style={({ pressed }) => (pressed ? { backgroundColor: theme.colors.background } : null)}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.tapTarget },
  body: { flex: 1, gap: 2 },
})
