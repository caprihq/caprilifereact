import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { TimeSlot } from '../logic/timeSlots'
import type { Task } from '@/types/entities'
import { PlannerTaskRow } from './PlannerTaskRow'

/**
 * One block of the day — Morning, Afternoon or Evening — with its tasks.
 *
 * The web client tints each block a different pastel (amber / orange / indigo),
 * which fights whatever accent the user picked. Here the block header carries an
 * icon and a count in the theme's own tones, and the *tasks* provide the colour
 * through their priority rails.
 *
 * The header's `+` opens a picker of tasks not already on today, which is how a
 * task gets into a block by hand rather than through auto-scheduling.
 */

type PlannerSlotProps = {
  readonly slot: TimeSlot
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly timeZone: string
  readonly pickerOpen: boolean
  readonly onTogglePicker: () => void
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onRemove: (task: Task) => void
}

export const PlannerSlot = ({
  slot,
  tasks,
  nowMs,
  timeZone,
  pickerOpen,
  onTogglePicker,
  onOpen,
  onComplete,
  onRemove,
}: PlannerSlotProps) => {
  const theme = useTheme()
  const count = tasks.length

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={[styles.header, { gap: theme.spacing.sm }]}>
        <Ionicons name={slot.icon} size={18} color={theme.colors.accentInk} />
        <Text variant="bodyStrong">{slot.label}</Text>
        <Text variant="caption" tone="muted">
          {slot.sub}
        </Text>

        <View style={styles.spacer} />

        <Text variant="caption" tone="secondary">
          {count === 1 ? '1 item' : `${String(count)} items`}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pickerOpen ? `Close picker for ${slot.label}` : `Add a task to ${slot.label}`}
          onPress={onTogglePicker}
          hitSlop={theme.spacing.md}
        >
          <Ionicons
            name={pickerOpen ? 'close' : 'add'}
            size={20}
            color={theme.colors.accentInk}
          />
        </Pressable>
      </View>

      {/*
        An empty slot draws nothing. The header already says "0 items" and offers
        the plus; a card underneath repeating "Nothing scheduled" turned an empty
        day into three stacked announcements of failure.
      */}
      {count === 0 ? null : (
        <View style={{ gap: theme.spacing.sm }}>
          {tasks.map((task) => (
            <PlannerTaskRow
              key={task.id}
              task={task}
              nowMs={nowMs}
              timeZone={timeZone}
              onOpen={() => onOpen(task)}
              onComplete={() => onComplete(task)}
              onRemove={() => onRemove(task)}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
})
