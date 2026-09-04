import { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { size } from '@/theme'

import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UpgradePrompt, useUpgradePrompt } from '@/features/profile'
import { LoadingView } from '@/components/LoadingView'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { usePlan } from '@/hooks/usePlan'
import type { AppNavigation } from '@/navigation/types'
import type { Task } from '@/types/entities'
import { usePlannerDay } from '../hooks/usePlannerDay'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { PlannerSlot } from '../components/PlannerSlot'
import { PlannerAside } from '../components/PlannerAside'
import { SlotTaskPicker } from '../components/SlotTaskPicker'

/**
 * The day as three blocks, plus what has fallen outside them.
 *
 * Replaces a flat list of three sections. The web client's planner is the model:
 * Morning / Afternoon / Evening, each able to take a task by hand, then "Needs
 * attention" for work due today that has no time yet, and carryover for anything
 * older. Grouping and scheduling rules are pure and tested — see `timeSlots` and
 * `plannerLogic`.
 */
export const PlannerScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const feed = useTaskFeed()
  const { hasAccess } = usePlan()
  const planner = usePlannerDay(feed)
  const upgrade = useUpgradePrompt()
  const [refreshing, setRefreshing] = useState(false)

  /** Same as Home and All tasks: the spinner waits for the data. */
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await feed.refetch()
    setRefreshing(false)
  }, [feed])

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

  if (feed.isLoading) return <LoadingView />

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.xl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Button label="Smart Auto-Schedule" onPress={autoSchedule} />

      {planner.day.blocks.map(({ slot, tasks }) => (
        <View key={slot.key} style={{ gap: theme.spacing.sm }}>
          <PlannerSlot
            slot={slot}
            tasks={tasks}
            nowMs={feed.nowMs}
            timeZone={feed.timeZone}
            pickerOpen={planner.openPicker === slot.key}
            onTogglePicker={() => planner.togglePicker(slot.key)}
            onOpen={open}
            onComplete={planner.completeTask}
            onRemove={planner.removeFromDay}
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
      />

      <PlannerAside
        title="Carried over"
        subtitle="From earlier days"
        tasks={planner.day.overdue}
        tone="muted"
        onOpen={open}
      />

      <Text variant="caption" tone="muted" align="center">
        CAPRI plans between 9am and 6pm.
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
