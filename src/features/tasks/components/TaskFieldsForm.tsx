import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import type { ReactNode } from 'react'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ScheduledEventSection } from './ScheduledEventSection'
import { taskProblems } from '../logic/taskValidation'
import type { TaskProblem } from '../logic/taskValidation'
import { Picker } from '@/components/Picker'
import { Row } from '@/components/Row'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@/types/entities'
import type { TaskCategory, TaskPriority } from '@/types/entities'
import { DueDateRow } from './DueDateRow'
import { RecurrenceRow } from './RecurrenceRow'

/**
 * Confirm-and-correct step: shows what was extracted and lets the user fix it
 * before saving. The LLM occasionally misreads a date, and silently saving a
 * wrong due date is worse than asking.
 */

const DURATIONS = [15, 30, 45, 60, 120] as const

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

type TaskFieldsFormProps = {
  readonly draft: ParsedTask
  readonly onChange: (next: ParsedTask) => void
  readonly onSave: () => void
  readonly saving: boolean
  /**
   * Rendered between the fields and the save button.
   *
   * Task Detail puts its subtasks here. They used to sit *after* Save, and anything
   * below a save button reads as happening after you save — so the one section that
   * asks you to think was the one section people scrolled past.
   */
  readonly footer?: ReactNode
  /** Repeats is an Executive feature; the row still shows, locked. */
  readonly recurrenceLocked?: boolean
  readonly onUpgrade?: (() => void) | undefined
  /**
   * The Add Task sheet titles its own header per step, so it hides this one. The
   * task detail screen has no such header and keeps it.
   */
  readonly showHeading?: boolean
}

export const TaskFieldsForm = ({
  draft,
  onChange,
  onSave,
  saving,
  footer,
  recurrenceLocked = false,
  onUpgrade,
  showHeading = true,
}: TaskFieldsFormProps) => {
  const theme = useTheme()
  const [picker, setPicker] = useState<'category' | 'priority' | 'duration' | null>(null)
  const problems = taskProblems(draft)

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {showHeading ? <Text variant="title">Edit details</Text> : null}

      <TextField
        label="Title"
        placeholder="Task title"
        value={draft.title}
        onChangeText={(title) => onChange({ ...draft, title })}
        autoCapitalize="sentences"
      />

      <TextField
        label="Notes"
        showLabel
        placeholder="Anything worth remembering"
        value={draft.description ?? ''}
        onChangeText={(description) => onChange({ ...draft, description })}
        autoCapitalize="sentences"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        style={styles.notes}
      />

      <Card flush>
        <DueDateRow
          value={draft.due_date}
          onChange={(due_date) => onChange({ ...draft, due_date })}
        />
        <Row
          label="Duration"
          value={draft.estimated_minutes ? `${String(draft.estimated_minutes)} min` : 'Not set'}
          onPress={() => setPicker('duration')}
        />
        <Row
          label="Category"
          value={titleCase(draft.category ?? 'personal')}
          onPress={() => setPicker('category')}
        />
        <Row
          label="Priority"
          value={titleCase(draft.priority ?? 'medium')}
          onPress={() => setPicker('priority')}
          last
        />
      </Card>

      <RecurrenceRow
        value={draft.recurrence}
        endDate={draft.recurrence_end_date}
        locked={recurrenceLocked}
        onChange={(recurrence) => onChange({ ...draft, recurrence })}
        onChangeEndDate={(recurrence_end_date) => onChange({ ...draft, recurrence_end_date })}
        onUpgrade={onUpgrade ?? (() => undefined)}
      />

      <ScheduledEventSection draft={draft} onChange={onChange} />

      {footer}

      <SaveRow
        draft={draft}
        problems={problems}
        saving={saving}
        onSave={onSave}
      />

      <FieldPickers draft={draft} onChange={onChange} picker={picker} onClose={() => setPicker(null)} />
    </View>
  )
}

/**
 * The save button, and why it cannot be pressed.
 *
 * A greyed out control with no explanation reads as a broken app, and the reason here
 * is not guessable: a scheduled event needs a start time, and an event saved without
 * one appears nowhere at all.
 */
const SaveRow = ({
  draft,
  problems,
  saving,
  onSave,
}: {
  readonly draft: ParsedTask
  readonly problems: readonly TaskProblem[]
  readonly saving: boolean
  readonly onSave: () => void
}) => (
  <>
    {problems.length > 0 ? (
      <Text variant="caption" tone="danger" align="center">
        {problems.map((problem) => problem.message).join(' ')}
      </Text>
    ) : null}

    <Button
      label={draft.is_scheduled_event ? 'Save event' : 'Save & prioritise'}
      icon="sparkles"
      onPress={onSave}
      loading={saving}
      disabled={problems.length > 0}
    />
  </>
)

/** Category, priority and duration, which are choices rather than typing. */
const FieldPickers = ({
  draft,
  onChange,
  picker,
  onClose,
}: {
  readonly draft: ParsedTask
  readonly onChange: (next: ParsedTask) => void
  readonly picker: 'category' | 'priority' | 'duration' | null
  readonly onClose: () => void
}) => (
  <>
      <Picker
        open={picker === 'category'}
        title="Category"
        value={draft.category ?? 'personal'}
        options={TASK_CATEGORIES.map((value) => ({ value, label: titleCase(value) }))}
        onSelect={(category: TaskCategory) => onChange({ ...draft, category })}
        onClose={onClose}
      />

      <Picker
        open={picker === 'priority'}
        title="Priority"
        value={draft.priority ?? 'medium'}
        options={TASK_PRIORITIES.map((value) => ({ value, label: titleCase(value) }))}
        onSelect={(priority: TaskPriority) => onChange({ ...draft, priority })}
        onClose={onClose}
      />

      <Picker
        open={picker === 'duration'}
        title="Estimated duration"
        value={draft.estimated_minutes ? String(draft.estimated_minutes) : undefined}
        options={DURATIONS.map((minutes) => ({
          value: String(minutes),
          label: minutes >= 60 ? `${String(minutes / 60)} hour${minutes > 60 ? 's' : ''}` : `${String(minutes)} min`,
        }))}
        onSelect={(value) => onChange({ ...draft, estimated_minutes: Number(value) })}
        onClose={onClose}
      />
  </>
)

const styles = StyleSheet.create({
  /** Three lines before it scrolls: enough for a note, not a second screen. */
  notes: { minHeight: 84 },
  toggle: { flexDirection: 'row', alignItems: 'center' },
  toggleText: { flex: 1 },
})
