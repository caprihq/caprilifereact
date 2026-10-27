import { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { size } from '@/theme'

import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UpgradePrompt, useUpgradePrompt } from '@/features/profile'
import { LoadingView } from '@/components/LoadingView'
import { Text } from '@/components/Text'
import { useContentBottom } from '@/hooks/useContentBottom'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { usePlan } from '@/hooks/usePlan'
import type { AppNavigation } from '@/navigation/types'
import type { Task } from '@/types/entities'
import { usePlannerDay } from '../hooks/usePlannerDay'
import { useCurrentUser } from '@/services/api'
import { planningWindow } from '../logic/planningWindow'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { PlannerSlot } from '../components/PlannerSlot'
import { PlannerAside } from '../components/PlannerAside'
import { PlannerAllDay } from '../components/PlannerAllDay'
import { ClashList, clashHeading } from '../components/ClashList'
import { SlotTaskPicker } from '../components/SlotTaskPicker'

/**
 * The day as three blocks, plus what has fallen outside them.
 *
 * Replaces a flat list of three sections. The web client's planner is the model:
 * Morning / Afternoon / Evening, each able to take a task by hand, then "Needs
 * attention" for work due today that has no time yet, and carryover for anything
 * older. Each block shows the day's commitments and meetings beside its tasks, so
 * the plan and what it has to fit around are read in one place. Grouping and
 * scheduling rules are pure and tested — see `timeSlots`, `plannerLogic` and
 * `unifiedDay`.
 */
/**
 * Pull-to-refresh, waiting for the data.
 *
 * Awaited on purpose: setting the flag true and false in one tick batches into a
 * single render, so the control snaps back before the refetch has left the device
 * and the pull looks like it did nothing. Its own hook so the screen body stays
 * inside the 80-line limit (§3.2).
 */
const usePullToRefresh = (refetch: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  return { refreshing, onRefresh }
}

/**
 * Where the planner leads: a task's detail, the full list, and the auto-schedule
 * review behind its plan gate. Its own hook so the screen stays a composition
 * inside the §3.2 limits.
 */
const usePlannerActions = () => {
  const navigation = useNavigation<AppNavigation>()
  const { hasAccess } = usePlan()
  const upgrade = useUpgradePrompt()

  const open = useCallback(
    (task: Task) => navigation.navigate('TaskDetail', { taskId: task.id }),
    [navigation],
  )

  /**
   * Opens the review screen rather than scheduling anything here: the backend only
   * proposes times, and nothing is written until the user accepts one.
   */
  const autoSchedule = useCallback(() => {
    // A prompt that names the feature, rather than a toast that names the plan.
    if (!hasAccess('auto_schedule')) {
      upgrade.prompt('auto_schedule')
      return
    }
    navigation.navigate('AutoSchedule')
  }, [hasAccess, navigation, upgrade])

  const seeAll = useCallback(() => navigation.navigate('AllTasks'), [navigation])

  // Overlap fixes: the review screen planning just this task, or the task itself.
  const findNewTime = useCallback(
    (taskId: string) => navigation.navigate('AutoSchedule', { rescheduleTaskId: taskId }),
    [navigation],
  )
  const changeTime = useCallback(
    (taskId: string) => navigation.navigate('TaskDetail', { taskId }),
    [navigation],
  )

  return { open, autoSchedule, seeAll, upgrade, findNewTime, changeTime }
}

export const PlannerScreen = () => {
  const theme = useTheme()
  const contentBottom = useContentBottom()
  const wash = useWash()
  const { data: user } = useCurrentUser()
  const feed = useTaskFeed()
  const planner = usePlannerDay(feed)
  const { open, autoSchedule, seeAll, upgrade, findNewTime, changeTime } = usePlannerActions()
  const { refreshing, onRefresh } = usePullToRefresh(feed.refetch)

  if (feed.isLoading) return <LoadingView />

  return (
    <ScrollView
      contentContainerStyle={[
        wash,
        styles.page,
        // A full step between blocks, so each header reads as a divider and not as
        // the last row of the block above it.
        { gap: theme.spacing.xxl, paddingBottom: contentBottom },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <Button label="Smart Auto-Schedule" onPress={autoSchedule} />

      <ClashList
        heading={clashHeading(planner.clashes.length, 'today')}
        items={planner.clashes}
        onFindTime={findNewTime}
        onChangeTime={changeTime}
        onKeepBoth={planner.keepBoth}
      />

      <PlannerAllDay items={planner.day.allDay} />

      {planner.day.blocks.map(({ slot, rows }) => (
        <View key={slot.key} style={{ gap: theme.spacing.md }}>
          <PlannerSlot
            slot={slot}
            rows={rows}
            nowMs={feed.nowMs}
            timeZone={feed.timeZone}
            pickerOpen={planner.openPicker === slot.key}
            onTogglePicker={() => planner.togglePicker(slot.key)}
            onOpen={open}
            onComplete={planner.completeTask}
            onRemove={planner.removeFromDay}
            overlapFor={planner.overlapLabelFor}
          />

          {planner.openPicker === slot.key ? (
            <SlotTaskPicker
              tasks={planner.day.candidates}
              onPick={(task) => planner.schedule(task, slot.key)}
            />
          ) : null}
        </View>
      ))}

      <PlannerAside
        title="Needs attention"
        subtitle="Due today, no time set"
        tasks={planner.day.needsAttention}
        tone="warning"
        onOpen={open}
        onSeeAll={seeAll}
      />

      <PlannerAside
        title="Carried over"
        subtitle="From earlier days"
        tasks={planner.day.overdue}
        tone="muted"
        onOpen={open}
        onSeeAll={seeAll}
      />

      <Text variant="caption" tone="muted" align="center">
        {planningWindow(user)}
      </Text>

      <ConfirmDialog {...planner.completionPrompt} />

      <UpgradePrompt {...upgrade} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the day is empty, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
