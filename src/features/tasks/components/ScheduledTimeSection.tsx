import { View } from 'react-native'

import { Card } from '@/components/Card'
import { DateTimeRow } from '@/components/DateTimeRow'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { ParsedTask } from '../logic/parseTaskInput'
import { withDayOf, withTimeOf } from '../logic/clashItems'

/**
 * When a planned task happens — editable, for any task that has a time.
 *
 * Before this, only a "scheduled event" had a time field. A task placed by Smart
 * Auto-Schedule or dropped into a block could be removed and re-added, which put it
 * back at 9am, 1pm or 7pm, but never moved to 2:30. The end is not asked for: it
 * follows from the length above (see `toTaskPatch`).
 *
 * Hidden for scheduled events, which have their own time row in their own section.
 */
export const ScheduledTimeSection = ({
  draft,
  onChange,
}: {
  readonly draft: ParsedTask
  readonly onChange: (next: ParsedTask) => void
}) => {
  const theme = useTheme()
  if (draft.is_scheduled_event || !draft.scheduled_start_time) return null

  const start = new Date(draft.scheduled_start_time)
  if (Number.isNaN(start.getTime())) return null

  const set = (next: Date) => onChange({ ...draft, scheduled_start_time: next.toISOString() })

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label" tone="secondary">
        Scheduled
      </Text>
      <Card flush>
        <DateTimeRow label="Day" mode="date" value={start} onChange={(day) => set(withDayOf(start, day))} />
        <DateTimeRow label="Start" mode="time" value={start} onChange={(time) => set(withTimeOf(start, time))} />
      </Card>
    </View>
  )
}
