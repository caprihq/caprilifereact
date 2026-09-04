import { useState } from 'react'
import { size } from '@/theme'
import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { Picker } from '@/components/Picker'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { RECURRENCE_OPTIONS, recurrenceLabel } from '@/features/tasks/logic/recurrence'
import type { Recurrence } from '@/types/entities'
import { DueDateRow } from './DueDateRow'

/**
 * "Repeats" row for the task form.
 *
 * Recurring tasks are an Executive feature. A locked row still shows the
 * current value and routes to the plan screen instead of opening the picker, so
 * the capability is discoverable rather than invisible.
 *
 * **An end date appears once a task repeats.** `nextRecurrencePatch` has always
 * honoured `recurrence_end_date` — it stops spawning past it — but nothing could
 * set one, so every repeating task repeated forever. Choosing "Does not repeat"
 * clears the end date with it, since an end date without a recurrence is a value
 * nothing reads.
 */

type RecurrenceRowProps = {
  readonly value: Recurrence | undefined
  readonly endDate: string | undefined
  readonly locked: boolean
  readonly onChange: (value: Recurrence) => void
  readonly onChangeEndDate: (iso: string | undefined) => void
  readonly onUpgrade: () => void
}

export const RecurrenceRow = ({
  value,
  endDate,
  locked,
  onChange,
  onChangeEndDate,
  onUpgrade,
}: RecurrenceRowProps) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable
        onPress={() => (locked ? onUpgrade() : setOpen(true))}
        accessibilityRole="button"
        accessibilityLabel={`Repeats: ${recurrenceLabel(value)}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: pressed ? theme.colors.background : theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <Text variant="body" tone="secondary">
          Repeats
        </Text>

        <View style={[styles.value, { gap: theme.spacing.sm }]}>
          <Text variant="body" tone={locked ? 'muted' : 'primary'}>
            {recurrenceLabel(value)}
          </Text>
          <Ionicons
            name={locked ? 'lock-closed-outline' : 'chevron-forward'}
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </Pressable>

      {value && value !== 'none' ? (
        <Card flush>
          <DueDateRow label="Repeat until" value={endDate} onChange={onChangeEndDate} />
        </Card>
      ) : null}

      <Picker
        open={open}
        title="Repeats"
        value={value ?? 'none'}
        options={RECURRENCE_OPTIONS}
        onSelect={(next: Recurrence) => {
          onChange(next)
          // An end date with nothing to end is a value no reader looks at.
          if (next === 'none') onChangeEndDate(undefined)
        }}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: size.tapTarget,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: { flexDirection: 'row', alignItems: 'center' },
})
