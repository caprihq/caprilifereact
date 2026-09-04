import { Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'
import type { TimelineItem } from '@/features/commitments/logic/timeline'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { TimelineRow } from './TimelineRow'

/**
 * "Today's Commitments" — the merged timeline.
 *
 * Only rendered when there is something to show — `TodayCommitmentsSection` returns
 * null on an empty day, to keep Home about what needs doing. The empty state this
 * card used to draw is gone with it; the Add action it carried is duplicated in
 * Home's header, so an empty day is still one tap from a first commitment.
 */

type TodayCommitmentsCardProps = {
  /** Never empty: the section renders nothing rather than an empty card. */
  readonly items: readonly TimelineItem[]
  readonly onSelect: (item: TimelineItem) => void
  /** Long-press asks to remove a commitment. Calendar rows ignore it. */
  readonly onLongPress: (item: TimelineItem) => void
  readonly onAdd: () => void
}

export const TodayCommitmentsCard = ({
  items,
  onSelect,
  onLongPress,
  onAdd,
}: TodayCommitmentsCardProps) => {
  const theme = useTheme()

  return (
    <View>
      <View style={styles.header}>
        <SectionLabel>Today&apos;s Commitments</SectionLabel>
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a commitment"
          hitSlop={theme.spacing.sm}
          style={styles.add}
        >
          <Ionicons name="add" size={20} color={theme.colors.accentInk} />
        </Pressable>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
        }}
      >
        {items.map((item, index) => (
          <TimelineRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            onPress={() => onSelect(item)}
            onLongPress={() => onLongPress(item)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: { minWidth: size.tapTarget, alignItems: 'flex-end' },
})
