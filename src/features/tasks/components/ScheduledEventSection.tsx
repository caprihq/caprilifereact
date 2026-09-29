import { StyleSheet, View } from 'react-native'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { Toggle } from '@/components/Toggle'
import { useNow } from '@/hooks/useNow'
import { useTheme } from '@/hooks/useTheme'
import type { ParsedTask } from '../logic/parseTaskInput'
import { eventStartFrom, nextHalfHour } from '../logic/eventStart'
import { EventTimeRow } from './EventTimeRow'

/**
 * "Scheduled event", and the start time that makes it work.
 *
 * A commitment is something that happens at a time, not work to rank. Setting this
 * keeps the item out of Start Here and Up Next — `useTaskFeed` filters
 * `is_scheduled_event` out of the ranking — and puts it under Today's Commitments.
 *
 * Which is why the start time is not optional. Today's Commitments places an item by
 * `scheduled_start_time ?? due_date`; an event with neither has no anchor, so it is
 * dropped from the timeline *and* from Today's Plan, having already been excluded
 * from the ranking. The task existed and appeared nowhere but the full task list.
 * Switching the toggle on therefore fixes a time immediately, and the rows below let
 * it be changed — what it cannot be is absent.
 */

type ScheduledEventSectionProps = {
  readonly draft: ParsedTask
  readonly onChange: (next: ParsedTask) => void
}

export const ScheduledEventSection = ({ draft, onChange }: ScheduledEventSectionProps) => {
  const theme = useTheme()
  // Via `useNow`, not `Date.now()`: reading the clock during render is impure and
  // makes two components disagree about "now" within one pass.
  const nowMs = useNow()
  const value = draft.is_scheduled_event ?? false

  const toggle = (is_scheduled_event: boolean) => {
    onChange({
      ...draft,
      is_scheduled_event,
      // A time is fixed here rather than left blank. The web client leaves it empty
      // and stores no start at all until one is typed — and an event with no start
      // has no anchor, so it is shown nowhere. The row below makes it changeable;
      // what it must not be is absent.
      ...(is_scheduled_event && !draft.scheduled_start_time
        ? {
            scheduled_start_time: eventStartFrom({
              dueDate: draft.due_date,
              time: nextHalfHour(nowMs),
              nowMs,
            }),
          }
        : {}),
    })
  }

  return (
    <>
      <Card>
        <View
          style={[
            styles.toggle,
            {
              gap: theme.spacing.md,
              // An active setting says so with more than the switch: the row picks
              // up the accent edge used elsewhere for "this is on", so the state is
              // readable at a glance and without relying on colour alone.
              borderLeftWidth: value ? theme.size.noticeEdge : 0,
              borderLeftColor: theme.colors.accent,
              paddingLeft: value ? theme.spacing.md : 0,
            },
          ]}
        >
          <View style={styles.toggleText}>
            <Text variant={value ? 'bodyStrong' : 'body'}>Scheduled event</Text>
            <Text variant="caption" tone={value ? 'accent' : 'muted'}>
              {value
                ? 'On — this is an appointment. It shows under Today’s Commitments and is not ranked as work.'
                : 'Off — this is ranked as work. Turn on for an appointment.'}
            </Text>
          </View>
          <Toggle label="Scheduled event" value={value} onChange={toggle} />
        </View>
      </Card>

      {value ? (
        <Card flush>
          <EventTimeRow
            dueDate={draft.due_date}
            value={draft.scheduled_start_time}
            nowMs={nowMs}
            onChange={(scheduled_start_time) => {
              onChange({ ...draft, scheduled_start_time })
            }}
          />
        </Card>
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { flex: 1, gap: 2 },
})
