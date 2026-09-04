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
import { useReprioritise } from '../hooks/useReprioritise'
import { useSubtaskEditor } from '../hooks/useSubtaskEditor'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UpgradePrompt, useUpgradePrompt } from '@/features/profile'
import type { GatedFeature } from '@/features/profile'
import {
  COMPLETION_CONFIRM_LABEL,
  COMPLETION_ICON,
  COMPLETION_MESSAGE,
  completionTitle,
} from '../logic/completionPrompt'
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
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const upgrade = useUpgradePrompt()
  const reprioritise = useReprioritise(task, userEmail)
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
  /** Each gate names itself, so the prompt can say what was reached for. */
  const openPlan = upgrade.prompt

  const setRecurrence = (recurrence: Recurrence) => {
    updateTask.mutate({ id: task.id, data: { recurrence } })
  }

  // Null, not undefined: Base44 leaves an omitted field alone, so clearing the end
  // date has to be sent explicitly or the series keeps its old stop point.
  const setRecurrenceEnd = (iso: string | undefined) => {
    updateTask.mutate({ id: task.id, data: { recurrence_end_date: iso ?? null } })
  }

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <TaskFieldsForm
        draft={editing}
        onChange={setDraft}
        onSave={() => {
          updateTask.mutate({ id: task.id, data: toTaskPatch(editing) })
          navigation.goBack()
        }}
        saving={updateTask.isPending}
      />

      <TaskDetailExtras
        task={task}
        subtasks={subtasks}
        reprioritise={reprioritise}
        canReprioritise={hasAccess('analytics')}
        recurrenceLocked={!hasAccess('recurring_tasks')}
        onSetRecurrence={setRecurrence}
        onSetRecurrenceEnd={setRecurrenceEnd}
        onUpgrade={openPlan}
        onComplete={() => {
          setConfirmingComplete(true)
        }}
        onDelete={() => {
          deleteTask.mutate(task.id)
          navigation.goBack()
        }}
      />

      <ConfirmDialog
        open={confirmingComplete}
        title={completionTitle(task)}
        message={COMPLETION_MESSAGE}
        confirmLabel={COMPLETION_CONFIRM_LABEL}
        icon={COMPLETION_ICON}
        onConfirm={() => {
          setConfirmingComplete(false)
          completeTask(task)
          navigation.goBack()
        }}
        onCancel={() => {
          setConfirmingComplete(false)
        }}
      />

      <UpgradePrompt {...upgrade} />
    </View>
  )
}

/**
 * Everything below the edit form: how the task repeats, its subtasks, and the
 * terminal actions. Split out so each body stays inside the 80-line limit (§3.2).
 */
const TaskDetailExtras = ({
  task,
  subtasks,
  reprioritise,
  canReprioritise,
  recurrenceLocked,
  onSetRecurrence,
  onSetRecurrenceEnd,
  onUpgrade,
  onComplete,
  onDelete,
}: {
  readonly task: Task
  readonly subtasks: ReturnType<typeof useSubtaskEditor>
  readonly reprioritise: ReturnType<typeof useReprioritise>
  readonly canReprioritise: boolean
  readonly recurrenceLocked: boolean
  readonly onSetRecurrence: (value: Recurrence) => void
  readonly onSetRecurrenceEnd: (iso: string | undefined) => void
  readonly onUpgrade: (feature: GatedFeature) => void
  readonly onComplete: () => void
  readonly onDelete: () => void
}) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <RecurrenceRow
        value={task.recurrence}
        endDate={task.recurrence_end_date}
        locked={recurrenceLocked}
        onChange={onSetRecurrence}
        onChangeEndDate={onSetRecurrenceEnd}
        onUpgrade={() => onUpgrade('recurring_tasks')}
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
        onUpgrade={() => onUpgrade('subtasks')}
      />

      <TaskDetailActions
        task={task}
        reprioritising={reprioritise.running}
        canReprioritise={canReprioritise}
        onReprioritise={() => void reprioritise.run()}
        onUpgrade={() => onUpgrade('reprioritise')}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    </View>
  )
}
