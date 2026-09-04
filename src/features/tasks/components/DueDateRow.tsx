import { useState } from 'react'
import { Platform, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { Row } from '@/components/Row'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { pickerAppearance } from '@/components/pickerAppearance'

/**
 * Due-date row with the platform date picker.
 *
 * iOS renders inline once opened; Android shows its own dialog and closes
 * itself, so the picker is dismissed on any event there.
 */

type DueDateRowProps = {
  readonly value: string | undefined
  readonly onChange: (iso: string | undefined) => void
  /** Defaults to "Due date"; recurrence reuses this row as "Repeat until". */
  readonly label?: string
}

export const DueDateRow = ({ value, onChange, label = 'Due date' }: DueDateRowProps) => {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  const date = value ? new Date(value) : null
  const valid = date && !Number.isNaN(date.getTime())

  return (
    <View>
      <Row
        label={label}
        value={
          valid
            ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Not set'
        }
        onPress={() => setOpen((current) => !current)}
      />

      {open ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
          <DateTimePicker
            // Without this the picker follows the phone's appearance, not the
            // app's: white day numbers on a light sheet.
            {...pickerAppearance(theme)}
            value={valid ? date : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, selected) => {
              if (Platform.OS !== 'ios') setOpen(false)
              if (event.type === 'dismissed') return
              if (selected) onChange(selected.toISOString())
            }}
          />

          {valid ? (
            <Text
              variant="label"
              tone="danger"
              onPress={() => {
                onChange(undefined)
                setOpen(false)
              }}
            >
              Clear {label.toLowerCase()}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
