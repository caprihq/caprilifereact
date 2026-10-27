import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { useTheme } from '@/hooks/useTheme'
import type { TimeSlot } from '../logic/timeSlots'
import type { DayRow } from '../logic/unifiedDay'
import type { Task } from '@/types/entities'
import { PlannerFixedRow } from './PlannerFixedRow'
import { CountPill, HEADER_DISC, PlannerSectionHeader } from './PlannerSectionHeader'
import { PlannerTaskRow } from './PlannerTaskRow'

/**
 * One block of the day — Morning, Afternoon or Evening — with everything in it:
 * tasks, and the commitments and meetings they have to fit around (`unifiedDay`).
 *
 * The web client tints each block a different pastel (amber / orange / indigo),
 * which fights whatever accent the user picked. Here the block header carries an
 * icon and a count in the theme's own tones, and the *tasks* provide the colour
 * through their priority rails.
 *
 * The rows sit in **one flush card** with hairline dividers, the same surface the
 * asides use. They used to be loose rounded rectangles — tasks filled, meetings
 * outlined, each with a 12pt corner next to the asides' 22pt — and the mismatched
 * edges were most of what made the page look unaligned.
 *
 * The header's `+` opens a picker of tasks not already on today, which is how a
 * task gets into a block by hand rather than through auto-scheduling.
 */

type PlannerSlotProps = {
  readonly slot: TimeSlot
  readonly rows: readonly DayRow[]
  readonly nowMs: number
  readonly timeZone: string
  readonly pickerOpen: boolean
  readonly onTogglePicker: () => void
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onRemove: (task: Task) => void
  /** The overlap warning for a task, when it has one. */
  readonly overlapFor?: (taskId: string) => string | undefined
}

/** A scheduled-event task opens like any task; other fixed items have nowhere to go. */
const openerFor = (task: Task | undefined, onOpen: (task: Task) => void) =>
  task ? () => onOpen(task) : undefined

/** The round `+` on the right of a block: the same control a sheet header draws. */
const AddControl = ({
  slot,
  open,
  onPress,
}: {
  readonly slot: TimeSlot
  readonly open: boolean
  readonly onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        open ? `Close picker for ${slot.label}` : `Add a task to ${slot.label}`
      }
      onPress={onPress}
      hitSlop={theme.spacing.sm}
      style={({ pressed }) => [
        styles.add,
        {
          backgroundColor: open ? theme.colors.accentTint : theme.colors.fill,
          borderRadius: theme.radius.full,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={open ? 'close' : 'add'} size={22} color={theme.colors.accentInk} />
    </Pressable>
  )
}

export const PlannerSlot = ({
  slot,
  rows,
  nowMs,
  timeZone,
  pickerOpen,
  onTogglePicker,
  onOpen,
  onComplete,
  onRemove,
  overlapFor,
}: PlannerSlotProps) => {
  const theme = useTheme()
  const count = rows.length
  const divider = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <PlannerSectionHeader
        icon={slot.icon}
        title={slot.label}
        subtitle={slot.sub}
        trailing={
          <View style={[styles.trailing, { gap: theme.spacing.sm }]}>
            <CountPill label={count === 1 ? '1 item' : `${String(count)} items`} />
            <AddControl slot={slot} open={pickerOpen} onPress={onTogglePicker} />
          </View>
        }
      />

      {/*
        An empty slot draws nothing. The header already says "0 items" and offers
        the plus; a card underneath repeating "Nothing scheduled" turned an empty
        day into three stacked announcements of failure.
      */}
      {count === 0 ? null : (
        <Card flush>
          {rows.map((row, index) => (
            <View key={row.key} style={index === rows.length - 1 ? null : divider}>
              {row.kind === 'fixed' ? (
                <PlannerFixedRow
                  item={row.item}
                  onOpenTask={openerFor(row.item.task, onOpen)}
                />
              ) : (
                <PlannerTaskRow
                  task={row.task}
                  nowMs={nowMs}
                  timeZone={timeZone}
                  onOpen={() => onOpen(row.task)}
                  onComplete={() => onComplete(row.task)}
                  onRemove={() => onRemove(row.task)}
                  overlap={overlapFor?.(row.task.id)}
                />
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  trailing: { flexDirection: 'row', alignItems: 'center' },
  add: {
    width: HEADER_DISC,
    height: HEADER_DISC,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
