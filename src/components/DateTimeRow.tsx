import { useState } from 'react'
import { Platform, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { Row } from './Row'
import { useTheme } from '@/hooks/useTheme'

/**
 * A labelled row that opens the platform date or time picker.
 *
 * Generalised from DueDateRow, which hardcoded `mode="date"` and an optional
 * value. Commitments need three of these — a day and two times — and all of
 * them are required, so the value is a plain Date rather than `string | undefined`.
 *
 * iOS renders the picker inline once opened; Android shows its own dialog and
 * dismisses itself, so the picker is closed on any event there.
 */

type DateTimeRowProps = {
  readonly label: string
  readonly value: Date
  readonly mode: 'date' | 'time'
  readonly onChange: (value: Date) => void
}

const formatted = (value: Date, mode: 'date' | 'time'): string =>
  mode === 'date'
    ? value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export const DateTimeRow = ({ label, value, mode, onChange }: DateTimeRowProps) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <View>
      <Row
        label={label}
        value={formatted(value, mode)}
        onPress={() => setOpen((current) => !current)}
      />

      {open ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
          <DateTimePicker
            value={value}
            mode={mode}
            display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
            onChange={(event, selected) => {
              if (Platform.OS !== 'ios') setOpen(false)
              if (event.type === 'dismissed') return
              if (selected) onChange(selected)
            }}
          />
        </View>
      ) : null}
    </View>
  )
}
