import { useCallback, useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import { size } from '@/theme'

import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingView } from '@/components/LoadingView'
import { SheetHeader } from '@/components/SheetHeader'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { SheetNotice } from '@/components/Toast'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import type { AppNavigation, AppStackParamList } from '@/navigation/types'
import { track } from '@/services'
import { SuggestionCard } from '../components/SuggestionCard'
import { UnplacedList } from '../components/UnplacedList'
import { ClashList, clashHeading } from '../components/ClashList'
import { spanLabel } from '../logic/overlaps'
import { clashFor } from '../logic/suggestionEdits'
import { useWeekClashes } from '../hooks/useWeekClashes'
import { moreToPlanCaption, plannerCaption } from '../logic/autoScheduleNotice'
import { windowForSuggestion } from '../logic/suggestionWindow'
import { useAutoSchedule } from '../hooks/useAutoSchedule'
import type { Suggestion } from '../hooks/useAutoSchedule'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { syncAfter } from '../services/calendarSync'
import { useTaskMutations } from '../services/useTaskMutations'

/**
 * Review what CAPRI proposes, then accept the parts you want.
 *
 * The backend suggests and writes nothing, so **this screen is where a plan becomes
 * real**. Before it existed the app invoked the function, discarded the response and
 * reported success, which meant a user watched a "Scheduled 5 tasks" toast and then
 * found their day unchanged.
 *
 * Accepting one at a time rather than applying the batch is the web client's
 * behaviour and the right default: CAPRI proposes, the user decides. Nothing reaches
 * a task or a calendar until "Schedule it" is pressed.
 */

/**
 * Accepting one suggestion: save the window, then copy it to Google Calendar.
 *
 * The calendar sync waits for the save — see `syncAfter`. Firing it alongside the
 * optimistic update, as this used to, could sync nothing until the next accept.
 */
const useAccept = (userEmail: string | null, dismiss: (taskId: string) => void) => {
  const { show } = useFeedback()
  const { updateTask } = useTaskMutations({ userEmail, onFeedback: show })

  return useCallback(
    (suggestion: Suggestion) => {
      const window = windowForSuggestion(suggestion, suggestion.task)
      if (!window) {
        show({ message: 'That suggestion has no time to schedule into.', tone: 'error' })
        dismiss(suggestion.task_id)
        return
      }

      syncAfter(updateTask.mutateAsync({ id: suggestion.task_id, data: window }))
      track({ name: 'auto_schedule_accepted', params: { accepted: 1 } })
      dismiss(suggestion.task_id)
    },
    [dismiss, show, updateTask],
  )
}

export const AutoScheduleScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const feed = useTaskFeed()
  const route = useRoute<RouteProp<AppStackParamList, 'AutoSchedule'>>()
  const rescheduleTaskId = route.params?.rescheduleTaskId
  const plan = useAutoSchedule()
  const { run, running, suggestions, unplaced, meta, dismiss } = plan
  const accept = useAccept(feed.userEmail, dismiss)
  const week = useWeekClashes(plan.conflicts, feed.timeZone)

  // Opened from an overlap: plan just that task. Otherwise, the whole week.
  useEffect(() => {
    void run(rescheduleTaskId)
  }, [run, rescheduleTaskId])

  /** What a suggestion's time would clash with, as a warning line, if anything. */
  const clashOf = (suggestion: Suggestion) => {
    const clash = clashFor(suggestion, { others: suggestions, occupied: plan.occupied })
    return clash ? spanLabel(clash, feed.timeZone) : undefined
  }

  if (running) return <LoadingView message="Finding time for your work…" />

  const captions = [plannerCaption(meta.aiStatus), moreToPlanCaption(meta.moreToPlan)].filter(
    (line): line is string => line !== null,
  )

  return (
    /*
      No `fit` here. It exists for a `fitToContents` sheet, and it leaves the scroll
      view unbounded — with ten suggestions the list simply ran off the bottom with
      nothing to scroll. This sheet has real detents now, so the scroll view fills it.
    */
    <KeyboardAwareScroll align="top" contentStyle={[wash, styles.page, { gap: theme.spacing.md }]}>
      <SheetHeader title="Suggested plan" onClose={() => navigation.goBack()} />

      {/* Presented modally, so the floating toast renders behind this screen. */}
      <SheetNotice />

      {captions.map((line) => (
        <Text key={line} variant="caption" tone="muted">
          {line}
        </Text>
      ))}

      {/*
        "Nothing left to schedule" is only true when there is genuinely nothing. With
        tasks that could not be fitted, it contradicts the list directly below it —
        so the empty state yields to the explanation.
      */}
      {suggestions.length === 0 && unplaced.length === 0 ? (
        <Card>
          <EmptyState message="Nothing left to schedule" icon="calendar-outline" />
        </Card>
      ) : (
        suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.task_id}
            suggestion={suggestion}
            timeZone={feed.timeZone}
            onAccept={() => accept(suggestion)}
            onSkip={() => dismiss(suggestion.task_id)}
            onEdit={() => navigation.navigate('TaskDetail', { taskId: suggestion.task_id })}
            clash={clashOf(suggestion)}
            onRetime={(start) => plan.retime(suggestion.task_id, start)}
          />
        ))
      )}

      {/* Below the proposals, because it is context rather than a decision. */}
      <UnplacedList unplaced={unplaced} tasks={feed.allTasks} />

      <ClashList
        heading={clashHeading(week.items.length, 'this week')}
        items={week.items}
        onFindTime={(taskId) => void plan.reschedule(taskId)}
        onChangeTime={(taskId) => navigation.navigate('TaskDetail', { taskId })}
        onKeepBoth={week.keepBoth}
      />
    </KeyboardAwareScroll>
  )
}

const styles = StyleSheet.create({
  // Even padding. A doubled bottom left 48pt of bare wash under the last card, and
  // because the wash is a gradient that ends pale, it read as a band of a different
  // colour rather than as space.
  page: { padding: size.screenPadding },
})
