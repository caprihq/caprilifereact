import { useCallback, useMemo } from 'react'
import { size } from '@/theme'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingView } from '@/components/LoadingView'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { filterDailyPlannerTasks } from '@/features/tasks/logic/plannerLogic'
import { usePlan } from '@/hooks/usePlan'
import type { AppNavigation } from '@/navigation/types'
import type { Task } from '@/types/entities'
import { useAutoSchedule } from '../hooks/useAutoSchedule'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { PlannerGroup } from '../components/PlannerGroup'

/**
 * Daily planner: today's time blocks, what still needs attention, and
 * carryover. Grouping rules live in lib/planner and are unit-tested.
 */
export const PlannerScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const { show } = useFeedback()
  const feed = useTaskFeed()
  const { hasAccess } = usePlan()
  const { run, running } = useAutoSchedule()

  const plan = useMemo(
    () => filterDailyPlannerTasks(feed.allTasks, { nowMs: feed.nowMs, timeZone: feed.timeZone }),
    [feed.allTasks, feed.nowMs, feed.timeZone],
  )

  const open = useCallback(
    (task: Task) => navigation.navigate('TaskDetail', { taskId: task.id }),
    [navigation],
  )

  const autoSchedule = useCallback(() => {
    if (!hasAccess('auto_schedule')) {
      show({ message: 'Smart auto-scheduling is an Executive feature.', isError: true })
      return
    }
    void run()
  }, [hasAccess, run, show])

  if (feed.isLoading) return <LoadingView />

  const empty =
    plan.todayScheduled.length === 0 &&
    plan.needsAttention.length === 0 &&
    plan.overdue.length === 0

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.lg }]}
    >
      <Button
        label={running ? 'Planning your day…' : 'Smart Auto-Schedule'}
        onPress={autoSchedule}
        loading={running}
      />

      {empty ? (
        <Card>
          <EmptyState message="Nothing scheduled or overdue" glyph="🎉" />
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.lg }}>
          <PlannerGroup
            title="Today"
            tasks={plan.todayScheduled}
            timeZone={feed.timeZone}
            onOpen={open}
          />
          <PlannerGroup
            title="Needs attention"
            tasks={plan.needsAttention}
            timeZone={feed.timeZone}
            onOpen={open}
          />
          <PlannerGroup
            title="Carryover"
            tasks={plan.overdue}
            timeZone={feed.timeZone}
            onOpen={open}
          />
        </View>
      )}

      <Text variant="caption" tone="muted" align="center">
        CAPRI plans between your work hours, set in Profile.
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
