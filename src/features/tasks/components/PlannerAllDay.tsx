import { Text } from '@/components/Text'
import type { TimelineItem } from '@/features/commitments'

/**
 * Today's whole-day entries — a birthday, a holiday — on one quiet line.
 *
 * Part of the day but of no block in it: drawn at midnight they would sit at the top
 * of "Morning" as if they started at dawn.
 */

type PlannerAllDayProps = {
  readonly items: readonly TimelineItem[]
}

export const PlannerAllDay = ({ items }: PlannerAllDayProps) => {
  if (items.length === 0) return null

  return (
    <Text variant="caption" tone="muted">
      {`All day: ${items.map((item) => item.title).join(' · ')}`}
    </Text>
  )
}
