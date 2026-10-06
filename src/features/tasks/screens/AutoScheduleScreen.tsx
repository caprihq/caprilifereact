import { useCallback, useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { size } from '@/theme'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { LoadingView } from '@/components/LoadingView'
import { SheetHeader } from '@/components/SheetHeader'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { SheetNotice } from '@/components/Toast'
import { UnplacedList } from '../components/UnplacedList'
import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import type { AppNavigation } from '@/navigation/types'
import { windowForSuggestion } from '../logic/suggestionWindow'
import { useAutoSchedule } from '../hooks/useAutoSchedule'
import type { Suggestion } from '../hooks/useAutoSchedule'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { syncTasksToCalendar } from '../services/calendarSync'
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
 * behaviour and the right default: the scheduler works from a 9am–6pm window it
 * cannot see the user's calendar behind, so some suggestions will be wrong.
 */
export const AutoScheduleScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  /**
   * This screen covers the status bar — it is pushed or presented full-screen, not
   * a sheet — and it draws its own header, so nothing else is insetting it. Without
   * this the close button sits under the clock.
   */
  const { show } = useFeedback()
  const feed = useTaskFeed()
  const { run, running, suggestions, unplaced, dismiss } = useAutoSchedule()
  const { updateTask } = useTaskMutations({ userEmail: feed.userEmail, onFeedback: show })

  useEffect(() => {
    void run()
  }, [run])

  const accept = useCallback(
    (suggestion: Suggestion) => {
      const window = windowForSuggestion(suggestion.suggested_time, suggestion.task)
      if (!window) {
        show({ message: "That suggestion has no time to schedule into.", tone: 'error' })
        dismiss(suggestion.task_id)
        return
      }

      updateTask.mutate({ id: suggestion.task_id, data: window })
      dismiss(suggestion.task_id)

      // The block belongs in the user's calendar, not only in CAPRI: a plan the
      // rest of their day cannot see is a plan colleagues will book over. Not
      // awaited — the task is saved either way.
      void syncTasksToCalendar()
    },
    [dismiss, show, updateTask],
  )

  if (running) return <LoadingView message="Finding time for your work…" />

  return (
    /*
      No `fit` here. It exists for a `fitToContents` sheet, and it leaves the scroll
      view unbounded — with ten suggestions the list simply ran off the bottom with
      nothing to scroll. This sheet has real detents now, so the scroll view fills it.
    */
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, styles.page, { gap: theme.spacing.md }]}
    >
      <SheetHeader title="Suggested plan" onClose={() => navigation.goBack()} />

      {/* Presented modally, so the floating toast renders behind this screen. */}
      <SheetNotice />

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
          />
        ))
      )}

      {/* Below the proposals, because it is context rather than a decision. */}
      <UnplacedList unplaced={unplaced} tasks={feed.allTasks} />
    </KeyboardAwareScroll>
  )
}

/** One proposal: what, when, and why. */
const SuggestionCard = ({
  suggestion,
  timeZone,
  onAccept,
  onSkip,
  onEdit,
}: {
  readonly suggestion: Suggestion
  readonly timeZone: string
  readonly onAccept: () => void
  readonly onSkip: () => void
  readonly onEdit: () => void
}) => {
  const theme = useTheme()
  const when = new Date(suggestion.suggested_time)
  const label = Number.isNaN(when.getTime())
    ? 'Time unavailable'
    : when.toLocaleString('en-US', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      })

  return (
    <Card>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {suggestion.task?.title ?? 'Task'}
        </Text>
        <Text variant="body" tone="accent">
          {label}
        </Text>
        {suggestion.reason ? (
          <Text variant="body" tone="muted" numberOfLines={3}>
            {suggestion.reason}
          </Text>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
          <View style={styles.action}>
            <Button label="Schedule it" onPress={onAccept} />
          </View>
          <View style={styles.action}>
            <Button label="Skip" variant="ghost" onPress={onSkip} />
          </View>
        </View>

        {/*
          A third answer, because accept-or-skip is not the only one a person has:
          disagreeing with the time left nowhere to go but dismissing the suggestion
          and starting again from the planner. This opens the task itself, where the
          duration, the day and the event switch live.

          A link rather than a third full-height button. Three 52pt controls made the
          buttons most of the card and pushed CAPRI's reasoning — the part worth
          reading — into a thin grey line beneath them. Same pattern as
          "Ask CAPRI again" on Home.
        */}
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => [styles.edit, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="label" tone="accent" align="center">
            Edit details
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  // Even padding. A doubled bottom left 48pt of bare wash under the last card, and
  // because the wash is a gradient that ends pale, it read as a band of a different
  // colour rather than as space.
  page: { padding: size.screenPadding },
  actions: { flexDirection: 'row' },
  edit: { paddingTop: 10 },
  action: { flex: 1 },
})
