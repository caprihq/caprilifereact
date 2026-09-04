import { useCallback, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { size } from '@/theme'

import { Card } from '@/components/Card'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorView } from '@/components/ErrorView'
import { LoadingView } from '@/components/LoadingView'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { applyTaskFilter, emptyMessageFor } from '../logic/taskFilters'
import type { TaskFilter } from '../logic/taskFilters'
import { useHomeActions } from '../hooks/useHomeActions'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { FilterBar } from '../components/FilterBar'
import { SwipeableTaskRow } from '../components/SwipeableTaskRow'
import { TaskCard } from '../components/TaskCard'

/**
 * Every task, with its filters.
 *
 * This was a section at the foot of Home, below four other sections and the
 * commitments block — so reaching the list meant scrolling past everything else,
 * and Home had no single thing it was about. It is a screen of its own now, opened
 * from the button in Home's header, which is how the web client reaches it too
 * ("View All Tasks").
 *
 * Filter state is local: it is a view preference, not server data, and nothing
 * outside this screen reads it (§3.6).
 */
export const AllTasksScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const feed = useTaskFeed()
  const actions = useHomeActions(feed)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [refreshing, setRefreshing] = useState(false)

  /**
   * Awaited, or the spinner never shows: setting `refreshing` true and false in the
   * same tick is batched into one render, so the control snapped back before the
   * refetch had left the device and a pull looked like it did nothing.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await feed.refetch()
    setRefreshing(false)
  }, [feed])

  const visible = useMemo(
    () => applyTaskFilter(feed.allTasks, filter, { nowMs: feed.nowMs, timeZone: feed.timeZone }),
    [feed.allTasks, feed.nowMs, feed.timeZone, filter],
  )

  if (feed.isLoading) return <LoadingView />

  if (feed.isError) {
    return (
      <ErrorView
        title="Couldn't load your tasks"
        message="Check your connection and try again."
        onRetry={() => void feed.refetch()}
      />
    )
  }

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <FilterBar active={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <Card>
          <Text variant="body" tone="muted" align="center">
            {emptyMessageFor(filter)}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {visible.map((task) => (
            <SwipeableTaskRow
              key={task.id}
              completed={task.status === 'completed'}
              onPress={() => actions.onOpen(task)}
              onComplete={() => actions.onComplete(task)}
              onDefer={() => actions.onDefer(task)}
              onCancel={() => actions.onCancel(task)}
              flush
            >
              <TaskCard
                task={task}
                nowMs={feed.nowMs}
                timeZone={feed.timeZone}
                onToggle={() => actions.onComplete(task)}
              />
            </SwipeableTaskRow>
          ))}
        </View>
      )}

      <ConfirmDialog {...actions.completionPrompt} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the list is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
