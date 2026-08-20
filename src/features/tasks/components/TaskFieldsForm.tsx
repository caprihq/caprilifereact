import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Picker } from '@/components/Picker'
import { Row } from '@/components/Row'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { TASK_CATEGORIES, TASK_PRIORITIES } from '@/types/entities'
import type { TaskCategory, TaskPriority } from '@/types/entities'
import { DueDateRow } from './DueDateRow'

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
  readonly onBack: () => void
  readonly onSave: () => void
  readonly saving: boolean
}

export const TaskFieldsForm = ({
  draft,
  onChange,
  onBack,
  onSave,
  saving,
}: TaskFieldsFormProps) => {
  const theme = useTheme()
  const [picker, setPicker] = useState<'category' | 'priority' | 'duration' | null>(null)

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Text variant="title">Confirm</Text>

      <TextField
        label="Title"
        placeholder="Task title"
        value={draft.title}
        onChangeText={(title) => onChange({ ...draft, title })}
        autoCapitalize="sentences"
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

      <Button label="Save task" onPress={onSave} loading={saving} disabled={!draft.title.trim()} />
      <Button label="Back" variant="ghost" onPress={onBack} />

      <Picker
        open={picker === 'category'}
        title="Category"
        value={draft.category ?? 'personal'}
        options={TASK_CATEGORIES.map((value) => ({ value, label: titleCase(value) }))}
        onSelect={(category: TaskCategory) => onChange({ ...draft, category })}
        onClose={() => setPicker(null)}
      />

      <Picker
        open={picker === 'priority'}
        title="Priority"
        value={draft.priority ?? 'medium'}
        options={TASK_PRIORITIES.map((value) => ({ value, label: titleCase(value) }))}
        onSelect={(priority: TaskPriority) => onChange({ ...draft, priority })}
        onClose={() => setPicker(null)}
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
        onClose={() => setPicker(null)}
      />
    </View>
  )
}
