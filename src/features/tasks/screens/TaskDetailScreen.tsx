import { ScrollView, StyleSheet } from 'react-native'
import { size } from '@/theme'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'

import { ErrorView } from '@/components/ErrorView'
import { useWash } from '@/hooks/useWash'
import type { AppStackParamList } from '@/navigation/types'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { TaskDetailBody } from '../components/TaskDetailBody'

/**
 * View and edit a single task.
 *
 * Reads from the cached list rather than fetching by id, so opening a task is
 * instant and edits appear immediately through the optimistic cache.
 *
 * This screen resolves the task and nothing else; TaskDetailBody does the work,
 * so the editor hooks never sit behind the not-found return.
 */
export const TaskDetailScreen = () => {
  const wash = useWash()
  const navigation = useNavigation()
  const route = useRoute<RouteProp<AppStackParamList, 'TaskDetail'>>()

  const feed = useTaskFeed()
  const task = feed.allTasks.find((candidate) => candidate.id === route.params.taskId)

  if (!task) {
    return (
      <ErrorView
        title="Task not found"
        message="It may have been completed or deleted."
        onRetry={() => navigation.goBack()}
        retryLabel="Go back"
      />
    )
  }

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page]}
      keyboardShouldPersistTaps="handled"
    >
      <TaskDetailBody task={task} userEmail={feed.userEmail} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
