import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Suggestion } from '../hooks/useAutoSchedule'
import { SuggestionTimeEditor } from './SuggestionTimeEditor'

/**
 * One proposal: what, when, and why.
 *
 * Moved out of `AutoScheduleScreen`, which held two components and had passed the
 * 200-line limit (§3.1, §3.2).
 */

type SuggestionCardProps = {
  readonly suggestion: Suggestion
  readonly timeZone: string
  readonly onAccept: () => void
  readonly onSkip: () => void
  readonly onEdit: () => void
  /** "Overlaps Team meeting · 2:00 PM – 3:00 PM" when this time clashes. */
  readonly clash?: string | undefined
  /** A start the person picked; the length stays as planned. */
  readonly onRetime: (start: Date) => void
}

const WHEN: Intl.DateTimeFormatOptions = { weekday: 'short', hour: 'numeric', minute: '2-digit' }

/** "Tue 7:00 PM – 8:30 PM", or just the start when the end is missing or unreadable. */
const whenLabel = (suggestion: Suggestion, timeZone: string): string => {
  const start = new Date(suggestion.suggested_time)
  if (Number.isNaN(start.getTime())) return 'Time unavailable'

  const from = start.toLocaleString('en-US', { ...WHEN, timeZone })
  const end = suggestion.suggested_end ? new Date(suggestion.suggested_end) : null
  if (!end || Number.isNaN(end.getTime())) return from

  const to = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })
  return `${from} – ${to}`
}

export const SuggestionCard = ({
  suggestion,
  timeZone,
  onAccept,
  onSkip,
  onEdit,
  clash,
  onRetime,
}: SuggestionCardProps) => {
  const theme = useTheme()
  const [editingTime, setEditingTime] = useState(false)

  return (
    <Card>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {suggestion.task?.title ?? 'Task'}
        </Text>
        <Text variant="body" tone="accent">
          {whenLabel(suggestion, timeZone)}
        </Text>
        {clash ? (
          <Text variant="caption" tone="danger">
            <Ionicons name="alert-circle" size={12} color={theme.colors.danger} /> {clash}
          </Text>
        ) : null}
        {editingTime ? (
          <SuggestionTimeEditor value={new Date(suggestion.suggested_time)} onChange={onRetime} />
        ) : null}
        {suggestion.reason ? (
          <Text variant="body" tone="muted" numberOfLines={3}>
            {suggestion.reason}
          </Text>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
          <View style={styles.action}>
            <Button label="Schedule it" onPress={onAccept} />
          </View>
          <View style={styles.action}>
            <Button label="Skip" variant="ghost" onPress={onSkip} />
          </View>
        </View>

        {/*
          A third answer, because accept-or-skip is not the only one a person has:
          disagreeing with the time left nowhere to go but dismissing the suggestion
          and starting again from the planner. This opens the task itself, where the
          duration, the day and the event switch live.

          A link rather than a third full-height button. Three 52pt controls made the
          buttons most of the card and pushed CAPRI's reasoning — the part worth
          reading — into a thin grey line beneath them. Same pattern as
          "Ask CAPRI again" on Home.
        */}
        <View style={[styles.links, { gap: theme.spacing.xl, paddingTop: theme.spacing.sm }]}>
          <Link label={editingTime ? 'Done' : 'Change time'} onPress={() => setEditingTime((open) => !open)} />
          <Link label="Edit details" onPress={onEdit} />
        </View>
      </View>
    </Card>
  )
}

/** A text action under the buttons: a third answer without a third 52pt button. */
const Link = ({ label, onPress }: { readonly label: string; readonly onPress: () => void }) => {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={theme.spacing.sm}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      <Text variant="label" tone="accent">
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: { flex: 1 },
  links: { flexDirection: 'row', justifyContent: 'center' },
})
