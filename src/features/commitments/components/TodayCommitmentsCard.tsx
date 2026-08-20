import { Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TimelineItem } from '@/features/commitments/logic/timeline'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { TimelineRow } from './TimelineRow'

/**
 * "Today's Commitments" — the merged timeline.
 *
 * The web version returned null whenever the list was empty and the calendar
 * was not connected, so the whole section vanished and there was no way to add
 * a commitment from Home. Here the section always renders with an Add action:
 * a commitment is something a user creates, so the entry point has to exist
 * before the first one does.
 */

type TodayCommitmentsCardProps = {
  readonly items: readonly TimelineItem[]
  readonly calendarConnected: boolean
  readonly onSelect: (item: TimelineItem) => void
  readonly onAdd: () => void
}

const emptyMessage = (calendarConnected: boolean): string =>
  calendarConnected
    ? 'Nothing on your calendar today.'
    : 'Nothing scheduled today. Add a commitment to block out time.'

export const TodayCommitmentsCard = ({
  items,
  calendarConnected,
  onSelect,
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

      {items.length === 0 ? (
        <Card>
          <Text variant="body" tone="muted" align="center">
            {emptyMessage(calendarConnected)}
          </Text>
        </Card>
      ) : (
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
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  add: { minWidth: size.tapTarget, alignItems: 'flex-end' },
})
