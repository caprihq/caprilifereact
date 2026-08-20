import { useNavigation } from '@react-navigation/native'

import type { AppNavigation } from '@/navigation/types'
import type { TimelineItem } from '@/features/commitments/logic/timeline'
import type { Task } from '@/types/entities'
import { useTodayTimeline } from '../hooks/useTodayTimeline'
import { TodayCommitmentsCard } from './TodayCommitmentsCard'

/**
 * Container for Today's Commitments: loads the timeline and owns navigation, so
 * the card itself stays presentational and the Home screen stays a composition.
 */

type TodayCommitmentsSectionProps = {
  readonly userEmail: string | null
  readonly tasks: readonly Task[]
  readonly nowMs: number
  readonly timeZone: string
  readonly onOpenTask: (task: Task) => void
}

export const TodayCommitmentsSection = ({
  userEmail,
  tasks,
  nowMs,
  timeZone,
  onOpenTask,
}: TodayCommitmentsSectionProps) => {
  const navigation = useNavigation<AppNavigation>()
  const timeline = useTodayTimeline({ userEmail, tasks, nowMs, timeZone })

  /** Only task rows lead anywhere today; commitments have no detail screen yet. */
  const select = (item: TimelineItem) => {
    if (item.task) onOpenTask(item.task)
  }

  return (
    <TodayCommitmentsCard
      items={timeline.items}
      calendarConnected={timeline.calendarConnected}
      onSelect={select}
      onAdd={() => navigation.navigate('AddCommitment')}
    />
  )
}
