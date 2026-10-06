import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { usePlan } from '@/hooks/usePlan'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { toTaskPatch } from '@/features/tasks/logic/toTaskPatch'
import type { AppNavigation } from '@/navigation/types'
import type { Task } from '@/types/entities'
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
import { ReasonNote } from './ReasonNote'
import { SubtasksSection } from './SubtasksSection'
import { TaskDetailActions } from './TaskDetailActions'
import { TaskFieldsForm } from './TaskFieldsForm'

/**
 * The task detail form, given a task that definitely exists.
 *
 * Split from TaskDetailScreen because the subtask editor is a hook, and hooks
 * cannot sit behind the screen's "task not found" early return.
 *
 * Subtasks save immediately rather than joining the draft: ticking a step is a
 * structural edit, not a text one, and `ParsedTask` — which this form and the
 * capture flow share — has no room for them.
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

  /**
   * The task as the form's draft.
   *
   * Every editable field belongs here, and four were missing. The form shows what
   * the draft says, so an absent field did not read as "unset" to the user — it read
   * as a fact about their task. "Scheduled event" was drawn Off for a task that *was*
   * a scheduled event, notes written on the web appeared blank, and a repeating task
   * said it did not repeat.
   *
   * `is_scheduled_event` is defaulted rather than left undefined so that switching it
   * off sends `false`: `toTaskPatch` omits an undefined field, and Base44 leaves an
   * omitted field alone, so the setting could be turned on and never off again.
   */
  const initial: ParsedTask = useMemo(
    () => ({
      title: task.title,
      // Coalesced: the API sends null for an empty description, and the form's
      // fields are typed as optional strings rather than nullable ones.
      description: task.description ?? undefined,
      due_date: task.due_date,
      estimated_minutes: task.estimated_minutes,
      category: task.category,
      priority: task.priority,
      is_scheduled_event: task.is_scheduled_event ?? false,
      scheduled_start_time: task.scheduled_start_time ?? undefined,
      recurrence: task.recurrence,
      recurrence_end_date: task.recurrence_end_date,
    }),
    [task],
  )

  const editing = draft ?? initial
  /** Each gate names itself, so the prompt can say what was reached for. */
  const openPlan = upgrade.prompt


  // Null, not undefined: Base44 leaves an omitted field alone, so clearing the end
  // date has to be sent explicitly or the series keeps its old stop point.

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {/* Above the fields: why this task is where it is, before how to change it. */}
      <ReasonNote reason={task.priority_reason ?? undefined} />

      <TaskFieldsForm
        draft={editing}
        onChange={setDraft}
        onSave={() => {
          updateTask.mutate({ id: task.id, data: toTaskPatch(editing) })
          navigation.goBack()
        }}
        saving={updateTask.isPending}
        recurrenceLocked={!hasAccess('recurring_tasks')}
        onUpgrade={() => openPlan('recurring_tasks')}
        footer={<Subtasks editor={subtasks} onUpgrade={() => openPlan('subtasks')} />}
      />

      <TaskDetailExtras
        task={task}
        reprioritise={reprioritise}
        canReprioritise={hasAccess('analytics')}
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

/** The steps a task breaks into, rendered above the save button. */
const Subtasks = ({
  editor,
  onUpgrade,
}: {
  readonly editor: ReturnType<typeof useSubtaskEditor>
  readonly onUpgrade: () => void
}) => (
  <SubtasksSection
    subtasks={editor.subtasks}
    progress={editor.progress}
    locked={editor.locked}
    generating={editor.generating}
    editingId={editor.editingId}
    onToggle={editor.toggle}
    onRemove={editor.remove}
    onRename={editor.rename}
    onStartEditing={editor.startEditing}
    onAdd={editor.add}
    onGenerate={() => void editor.generate()}
    onUpgrade={onUpgrade}
  />
)

/**
 * What belongs *after* saving: re-prioritise, complete, delete.
 *
 * Repeats and subtasks used to live here too, which put them below the save button
 * — read as "after you save" and scrolled past. They are fields, so they now sit
 * with the fields; only the terminal actions remain.
 */
const TaskDetailExtras = ({
  task,
  reprioritise,
  canReprioritise,
  onUpgrade,
  onComplete,
  onDelete,
}: {
  readonly task: Task
  readonly reprioritise: ReturnType<typeof useReprioritise>
  readonly canReprioritise: boolean
  readonly onUpgrade: (feature: GatedFeature) => void
  readonly onComplete: () => void
  readonly onDelete: () => void
}) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.lg }}>
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
