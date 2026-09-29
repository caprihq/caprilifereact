import { useState } from 'react'
import { Platform, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { PickerPanel } from './PickerPanel'
import { Row } from './Row'
import { useTheme } from '@/hooks/useTheme'
import { pickerAppearance } from './pickerAppearance'

/**
 * A labelled row that opens the platform date or time picker.
 *
 * Generalised from DueDateRow, which hardcoded `mode="date"` and an optional
 * value. Commitments need three of these — a day and two times — and all of
 * them are required, so the value is a plain Date rather than `string | undefined`.
 *
 * On iOS the picker appears inline inside `PickerPanel`, which supplies confirm and
 * close; Android shows its own dialog with its own buttons and dismisses itself.
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
  /** The selection awaiting confirmation — see `PickerPanel`. */
  const [pending, setPending] = useState<Date | null>(null)

  const close = () => {
    setOpen(false)
    setPending(null)
  }

  const confirm = () => {
    // Commits the shown value even when nothing moved, which is what makes the
    // already-selected date selectable.
    onChange(pending ?? value)
    close()
  }

  const picker = (
    <DateTimePicker
      // Without this the picker follows the phone's appearance, not the
      // app's: white day numbers on a light sheet.
      {...pickerAppearance(theme)}
      value={pending ?? value}
      mode={mode}
      display={Platform.OS === 'ios' ? (mode === 'date' ? 'inline' : 'spinner') : 'default'}
      onChange={(event, selected) => {
        if (Platform.OS !== 'ios') {
          setOpen(false)
          if (event.type === 'dismissed') return
          if (selected) onChange(selected)
          return
        }
        if (selected) setPending(selected)
      }}
    />
  )

  return (
    <View>
      <Row
        label={label}
        value={formatted(pending ?? value, mode)}
        onPress={() => {
          if (open) close()
          else setOpen(true)
        }}
      />

      {open ? (
        Platform.OS === 'ios' ? (
          <PickerPanel title={label} onCancel={close} onConfirm={confirm}>
            {picker}
          </PickerPanel>
        ) : (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>{picker}</View>
        )
      ) : null}
    </View>
  )
}
