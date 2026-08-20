import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { usePlan } from '@/hooks/usePlan'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { toTaskPatch } from '@/features/tasks/logic/toTaskPatch'
import type { AppNavigation } from '@/navigation/types'
import type { Recurrence, Task } from '@/types/entities'
import { useTaskMutations } from '../services/useTaskMutations'
import { useSubtaskEditor } from '../hooks/useSubtaskEditor'
import { RecurrenceRow } from './RecurrenceRow'
import { SubtasksSection } from './SubtasksSection'
import { TaskDetailActions } from './TaskDetailActions'
import { TaskFieldsForm } from './TaskFieldsForm'

/**
 * The task detail form, given a task that definitely exists.
 *
 * Split from TaskDetailScreen because the subtask editor is a hook, and hooks
 * cannot sit behind the screen's "task not found" early return.
 *
 * Recurrence and subtasks save immediately rather than joining the draft: both
 * are structural rather than text edits, and `ParsedTask` — which the form and
 * the capture flow share — has no room for them.
 */

type TaskDetailBodyProps = {
  readonly task: Task
  readonly userEmail: string | null
}

export const TaskDetailBody = ({ task, userEmail }: TaskDetailBodyProps) => {
  const theme = useTheme()
  const navigation = useNavigation<AppNavigation>()
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const { updateTask, deleteTask, completeTask } = useTaskMutations({
    userEmail,
    onFeedback: show,
  })
  const subtasks = useSubtaskEditor(task, userEmail)
  const [draft, setDraft] = useState<ParsedTask | null>(null)

  const initial: ParsedTask = useMemo(
    () => ({
      title: task.title,
      due_date: task.due_date,
      estimated_minutes: task.estimated_minutes,
      category: task.category,
      priority: task.priority,
    }),
    [task],
  )

  const editing = draft ?? initial
  const openPlan = () => navigation.navigate('Plan')

  const setRecurrence = (recurrence: Recurrence) => {
    updateTask.mutate({ id: task.id, data: { recurrence } })
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <TaskFieldsForm
        draft={editing}
        onChange={setDraft}
        onBack={() => navigation.goBack()}
        onSave={() => {
          updateTask.mutate({ id: task.id, data: toTaskPatch(editing) })
          navigation.goBack()
        }}
        saving={updateTask.isPending}
      />

      <RecurrenceRow
        value={task.recurrence}
        locked={!hasAccess('recurring_tasks')}
        onChange={setRecurrence}
        onUpgrade={openPlan}
      />

      <SubtasksSection
        subtasks={subtasks.subtasks}
        progress={subtasks.progress}
        locked={subtasks.locked}
        generating={subtasks.generating}
        editingId={subtasks.editingId}
        onToggle={subtasks.toggle}
        onRemove={subtasks.remove}
        onRename={subtasks.rename}
        onStartEditing={subtasks.startEditing}
        onAdd={subtasks.add}
        onGenerate={() => void subtasks.generate()}
        onUpgrade={openPlan}
      />

      <TaskDetailActions
        task={task}
        onComplete={() => {
          completeTask(task)
          navigation.goBack()
        }}
        onDelete={() => {
          deleteTask.mutate(task.id)
          navigation.goBack()
        }}
      />
    </View>
  )
}
