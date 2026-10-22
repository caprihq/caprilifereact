import { Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { Suggestion } from '../hooks/useAutoSchedule'

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

export const SuggestionCard = ({ suggestion, timeZone, onAccept, onSkip, onEdit }: SuggestionCardProps) => {
  const theme = useTheme()

  return (
    <Card>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {suggestion.task?.title ?? 'Task'}
        </Text>
        <Text variant="body" tone="accent">
          {whenLabel(suggestion, timeZone)}
        </Text>
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
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => [{ paddingTop: theme.spacing.sm, opacity: pressed ? 0.6 : 1 }]}
        >
          <Text variant="label" tone="accent" align="center">
            Edit details
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row' },
  action: { flex: 1 },
})
