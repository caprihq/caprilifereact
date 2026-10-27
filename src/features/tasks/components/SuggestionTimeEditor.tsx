import { View } from 'react-native'

import { DateTimeRow } from '@/components/DateTimeRow'
import { useTheme } from '@/hooks/useTheme'
import { withDayOf, withTimeOf } from '../logic/clashItems'

/**
 * Pick a different day or start time for a suggestion, before accepting it.
 *
 * The length stays what CAPRI planned (see `retimed`); only when it starts changes.
 * Whether the new time clashes is shown on the card itself, live, as it changes.
 */
export const SuggestionTimeEditor = ({
  value,
  onChange,
}: {
  readonly value: Date
  readonly onChange: (next: Date) => void
}) => {
  const theme = useTheme()
  return (
    <View style={{ borderRadius: theme.radius.lg, backgroundColor: theme.colors.fill, overflow: 'hidden' }}>
      <DateTimeRow label="Day" mode="date" value={value} onChange={(day) => onChange(withDayOf(value, day))} />
      <DateTimeRow label="Start" mode="time" value={value} onChange={(time) => onChange(withTimeOf(value, time))} />
    </View>
  )
}
