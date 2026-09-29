import { StyleSheet, View } from 'react-native'
import { size } from '@/theme'

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
}

export const TodayCommitmentsCard = ({
  items,
  onSelect,
  onLongPress,
}: TodayCommitmentsCardProps) => {
  const theme = useTheme()

  return (
    <View>
      {/*
        No add button. Appointments are created through Add Task with the Scheduled
        event switch, which is one form instead of two and produces something that
        can be completed and reminded about. This list shows what is already booked:
        imported calendar events, and scheduled-event tasks.
      */}
      <View style={styles.header}>
        <SectionLabel>Today&apos;s Commitments</SectionLabel>
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
