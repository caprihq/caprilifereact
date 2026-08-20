import { View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'
import type { BehaviouralSignals } from '@/features/tasks/logic/capriScoring'
import type { Task } from '@/types/entities'
import type { TaskFeed } from '../hooks/useTaskFeed'
import { TodayCommitmentsSection } from '@/features/commitments'
import { AllTasksSection } from './AllTasksSection'
import { HeroCard } from './HeroCard'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { TodayPlanCard } from './TodayPlanCard'
import { UpNextCard } from './UpNextCard'

/**
 * The three Home sections. Extracted so the screen stays a thin composition
 * of data + layout rather than one long render (guidelines §3.2, §3.3).
 */

export type TaskActions = {
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onDefer: (task: Task) => void
  readonly onCancel: (task: Task) => void
  readonly onViewPlan: () => void
}

type HomeSectionsProps = {
  readonly feed: TaskFeed
  readonly signals: BehaviouralSignals
  readonly actions: TaskActions
  /** Whether the headline counts are unlocked for this plan. */
  readonly showStats: boolean
}

export const HomeSections = ({ feed, signals, actions, showStats }: HomeSectionsProps) => {
  const theme = useTheme()
  const { onOpen, onComplete, onDefer, onCancel, onViewPlan } = actions

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <View>
        <SectionLabel>Start Here</SectionLabel>
        <HeroCard
          task={feed.heroTask}
          nowMs={feed.nowMs}
          timeZone={feed.timeZone}
          signals={signals}
          onOpen={onOpen}
          onComplete={onComplete}
          onDefer={onDefer}
          onCancel={onCancel}
        />
      </View>

      <View>
        <SectionLabel>Up Next</SectionLabel>
        <UpNextCard
          tasks={feed.upNext}
          nowMs={feed.nowMs}
          signals={signals}
          onOpen={onOpen}
          onComplete={onComplete}
          onDefer={onDefer}
          onCancel={onCancel}
        />
      </View>

      <View>
        <SectionLabel>Today&apos;s Plan</SectionLabel>
        <TodayPlanCard
          tasks={feed.todayTasks}
          timeZone={feed.timeZone}
          onOpen={onOpen}
          onViewAll={onViewPlan}
        />
      </View>

      <TodayCommitmentsSection
        userEmail={feed.userEmail}
        tasks={feed.allTasks}
        nowMs={feed.nowMs}
        timeZone={feed.timeZone}
        onOpenTask={onOpen}
      />

      <AllTasksSection
        tasks={feed.allTasks}
        nowMs={feed.nowMs}
        timeZone={feed.timeZone}
        actions={actions}
        showStats={showStats}
      />
    </View>
  )
}
