import { useState } from 'react'
import { Platform, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { PickerPanel } from '@/components/PickerPanel'
import { Row } from '@/components/Row'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { pickerAppearance } from '@/components/pickerAppearance'

/**
 * Due-date row with the platform date picker.
 *
 * On iOS the calendar appears inline inside `PickerPanel`, which supplies the
 * confirm and close controls — see that file for why a bare inline picker could not
 * set a due date of today.
 *
 * Android shows its own dialog with its own buttons and dismisses itself, so it
 * keeps the direct path: what the dialog returns is committed immediately.
 */

type DueDateRowProps = {
  readonly value: string | undefined
  readonly onChange: (iso: string | undefined) => void
  /** Defaults to "Due date"; recurrence reuses this row as "Repeat until". */
  readonly label?: string
}

const readable = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const DueDateRow = ({ value, onChange, label = 'Due date' }: DueDateRowProps) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  /**
   * What the calendar is showing, before the user agrees to it.
   *
   * Held here rather than pushed straight to `onChange` so that closing without
   * confirming leaves the task as it was, and so confirming can commit a date the
   * picker never reported — the one it opened on.
   */
  const [pending, setPending] = useState<Date | null>(null)

  const date = value ? new Date(value) : null
  const valid = date && !Number.isNaN(date.getTime())

  const openPicker = () => {
    // An unset due date starts at today, which is the answer people want most often.
    setPending(valid ? date : new Date())
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setPending(null)
  }

  const confirm = () => {
    if (pending) onChange(pending.toISOString())
    close()
  }

  const clear = (
    <Text
      variant="label"
      tone="danger"
      onPress={() => {
        onChange(undefined)
        close()
      }}
    >
      Clear {label.toLowerCase()}
    </Text>
  )

  const picker = (
    <DateTimePicker
      // Without this the picker follows the phone's appearance, not the app's:
      // white day numbers on a light sheet.
      {...pickerAppearance(theme)}
      value={pending ?? (valid ? date : new Date())}
      mode="date"
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      onChange={(event, selected) => {
        if (Platform.OS !== 'ios') {
          setOpen(false)
          if (event.type === 'dismissed') return
          if (selected) onChange(selected.toISOString())
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
        value={valid ? readable(date) : 'Not set'}
        onPress={() => {
          if (open) close()
          else openPicker()
        }}
      />

      {open ? (
        Platform.OS === 'ios' ? (
          <PickerPanel
            title={label}
            onCancel={close}
            onConfirm={confirm}
            footer={valid ? clear : null}
          >
            {picker}
          </PickerPanel>
        ) : (
          <View style={{ paddingHorizontal: theme.spacing.lg }}>{picker}</View>
        )
      ) : null}
    </View>
  )
}
