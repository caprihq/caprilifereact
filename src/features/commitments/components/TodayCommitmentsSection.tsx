import { useNavigation } from '@react-navigation/native'

import type { AppNavigation } from '@/navigation/types'
import type { TimelineItem } from '@/features/commitments/logic/timeline'
import type { Task } from '@/types/entities'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useFeedback } from '@/hooks/useFeedback'
import { useTodayTimeline } from '../hooks/useTodayTimeline'
import { useCommitmentMutations } from '../services/useCommitmentMutations'
import { TodayCommitmentsCard } from './TodayCommitmentsCard'

/**
 * Container for Today's Commitments: loads the timeline and owns navigation, so
 * the card itself stays presentational and the Home screen stays a composition.
 *
 * **Renders nothing when today is clear.** Home should be about what needs doing,
 * and a heading over "nothing scheduled today" is a row of furniture explaining its
 * own emptiness.
 *
 * The catch, and the reason this section used to render an empty state: its Add
 * button was the only route to `AddCommitment`, so hiding it left a user with no
 * commitments unable to make one. That action now lives in Home's header, where it
 * is reachable whether or not anything is scheduled.
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
  const { show } = useFeedback()
  const timeline = useTodayTimeline({ userEmail, tasks, nowMs, timeZone })
  const { deleteCommitment } = useCommitmentMutations(userEmail, (message) => {
    show({ message, tone: 'error' })
  })
  /** The commitment a long-press is asking about. */
  const [pendingDelete, setPendingDelete] = useState<TimelineItem | null>(null)

  /** Tasks open; commitments have no detail screen, so a tap on one does nothing. */
  const select = (item: TimelineItem) => {
    if (item.task) onOpenTask(item.task)
  }

  /**
   * Long-press removes a commitment.
   *
   * Only CAPRI's own: a calendar row belongs to Google, and deleting it here would
   * either fail or delete someone's real meeting. `TimelineRow` already refuses to
   * make those interactive.
   */
  const requestDelete = (item: TimelineItem) => {
    if (item.commitment) setPendingDelete(item)
  }

  if (timeline.items.length === 0) return null

  return (
    <>
      <TodayCommitmentsCard
        items={timeline.items}
        onSelect={select}
        onLongPress={requestDelete}
        onAdd={() => navigation.navigate('AddCommitment')}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? `Remove "${pendingDelete.title}"?` : ''}
        message="It disappears from today. This cannot be undone."
        confirmLabel="Remove"
        icon="trash-outline"
        onConfirm={() => {
          if (pendingDelete?.commitment) deleteCommitment.mutate(pendingDelete.commitment.id)
          setPendingDelete(null)
        }}
        onCancel={() => {
          setPendingDelete(null)
        }}
      />
    </>
  )
}
