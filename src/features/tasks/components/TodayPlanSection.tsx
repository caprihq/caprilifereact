import { useMemo, useState } from 'react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useCommitmentMutations, useTodayTimeline } from '@/features/commitments'
import type { TimelineItem } from '@/features/commitments'
import { useFeedback } from '@/hooks/useFeedback'
import type { Task } from '@/types/entities'
import type { TaskFeed } from '../hooks/useTaskFeed'
import { buildTodayPlan } from '../logic/todayPlan'
import { TodayPlanCard } from './TodayPlanCard'

/**
 * Today's Plan on Home: loads today's fixed items and merges them with the tasks
 * that have a time, so the card stays presentational.
 *
 * Replaces the separate Today's Commitments section, whose long-press removal of a
 * commitment it keeps. Shares its queries with the planner, so it costs no requests.
 */

type TodayPlanSectionProps = {
  readonly feed: TaskFeed
  readonly onOpen: (task: Task) => void
  readonly onViewPlan: () => void
  readonly overlapCount: number
}

export const TodayPlanSection = ({
  feed,
  onOpen,
  onViewPlan,
  overlapCount,
}: TodayPlanSectionProps) => {
  const { show } = useFeedback()
  const timeline = useTodayTimeline({
    userEmail: feed.userEmail,
    tasks: feed.allTasks,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })
  const { deleteCommitment } = useCommitmentMutations(feed.userEmail, (message) => {
    show({ message, tone: 'error' })
  })
  /** The commitment a long-press is asking about. */
  const [pendingDelete, setPendingDelete] = useState<TimelineItem | null>(null)

  const plan = useMemo(
    () =>
      buildTodayPlan({
        fixed: timeline.items,
        tasks: feed.todayTasks,
        nowMs: feed.nowMs,
        timeZone: feed.timeZone,
      }),
    [timeline.items, feed.todayTasks, feed.nowMs, feed.timeZone],
  )

  return (
    <>
      <TodayPlanCard
        plan={plan}
        timeZone={feed.timeZone}
        onSelect={(item) => {
          if (item.task) onOpen(item.task)
        }}
        // Only CAPRI's own commitments: a calendar row belongs to Google.
        onLongPress={(item) => {
          if (item.commitment) setPendingDelete(item)
        }}
        onViewAll={onViewPlan}
        overlapCount={overlapCount}
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
