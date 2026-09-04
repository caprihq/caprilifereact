import { View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'
import type { BehaviouralSignals } from '@/features/tasks/logic/capriScoring'
import type { Task } from '@/types/entities'
import type { TaskFeed } from '../hooks/useTaskFeed'
import type { useUpNext } from '../hooks/useUpNext'
import { TodayCommitmentsSection } from '@/features/commitments'
import { HeroCard } from './HeroCard'
import { MilestoneBanner } from './MilestoneBanner'
import { topPrioritiesCleared } from '../logic/milestone'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { TodayPlanCard } from './TodayPlanCard'
import { UpNextCard } from './UpNextCard'

/**
 * Home's sections: what to do now, what is next, today's plan, today's commitments.
 *
 * The full task list used to sit below all of this, with its filters and four
 * headline-count tiles, which meant Home ended in a second screen's worth of content
 * and had no single subject. The list lives in `AllTasksScreen` now, reached from the
 * header, and the count tiles are gone.
 *
 * Extracted so the screen stays a thin composition of data + layout rather than one
 * long render (guidelines §3.2, §3.3).
 */

type UpNext = ReturnType<typeof useUpNext>

export type TaskActions = {
  readonly onOpen: (task: Task) => void
  readonly onComplete: (task: Task) => void
  readonly onDefer: (task: Task) => void
  readonly onCancel: (task: Task) => void
  readonly onViewPlan: () => void
}

type HomeSectionsProps = {
  readonly feed: TaskFeed
  /** CAPRI's Up Next answer, cached and budgeted — see `useUpNext`. */
  readonly upNext: UpNext
  readonly signals: BehaviouralSignals
  readonly actions: TaskActions
}

export const HomeSections = ({ feed, signals, actions, upNext }: HomeSectionsProps) => {
  const theme = useTheme()
  const { onOpen, onComplete, onDefer, onCancel, onViewPlan } = actions

  return (
    <View style={{ gap: theme.spacing.xl }}>
      {/* Above Start Here, which is empty by definition when this fires. */}
      {topPrioritiesCleared(feed.allTasks, { nowMs: feed.nowMs, timeZone: feed.timeZone }) ? (
        <MilestoneBanner />
      ) : null}

      <View>
        <SectionLabel>Start Here</SectionLabel>
        <HeroCard
          // CAPRI's pick when it has answered; the local ranking until then, and
          // whenever the model is unreachable.
          task={upNext.hero?.task ?? feed.heroTask}
          {...(upNext.hero ? { reason: upNext.hero.reason } : {})}
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
          entries={upNext.entries}
          loading={upNext.loading}
          onRefresh={upNext.refresh}
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
    </View>
  )
}
