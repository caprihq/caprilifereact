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

const WHEN: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
}

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
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="heading" numberOfLines={2}>
          {suggestion.task?.title ?? 'Task'}
        </Text>

        <View style={[styles.when, { gap: theme.spacing.sm }]}>
          <Ionicons name="time-outline" size={16} color={theme.colors.accentInk} />
          <Text variant="bodyStrong" tone="accent">
            {whenLabel(suggestion, timeZone)}
          </Text>
        </View>

        {clash ? (
          <Text variant="caption" tone="danger">
            <Ionicons name="alert-circle" size={12} color={theme.colors.danger} /> {clash}
          </Text>
        ) : null}
        {editingTime ? (
          <SuggestionTimeEditor
            value={new Date(suggestion.suggested_time)}
            onChange={onRetime}
          />
        ) : null}
        {suggestion.reason ? (
          <Text variant="body" tone="secondary" numberOfLines={3}>
            {suggestion.reason}
          </Text>
        ) : null}

        <SuggestionActions
          editingTime={editingTime}
          onAccept={onAccept}
          onSkip={onSkip}
          onEdit={onEdit}
          onToggleTime={() => setEditingTime((open) => !open)}
        />
      </View>
    </Card>
  )
}

/**
 * The answers to a proposal: take it, leave it, or adjust it.
 *
 * Accept is the focal action and the wider of the pair; Skip is a filled secondary
 * so the two read as one control strip rather than a button beside a bare word.
 * Below a hairline sit the two adjustments as icon links — a third answer without a
 * third 56pt button, which would have made the buttons most of the card and pushed
 * CAPRI's reasoning into a thin grey line beneath them. Same pattern as "Ask CAPRI
 * again" on Home. "Change time" opens the picker in place; "Edit details" opens the
 * task itself, where the duration, the day and the event switch live.
 */
const SuggestionActions = ({
  editingTime,
  onAccept,
  onSkip,
  onEdit,
  onToggleTime,
}: {
  readonly editingTime: boolean
  readonly onAccept: () => void
  readonly onSkip: () => void
  readonly onEdit: () => void
  readonly onToggleTime: () => void
}) => {
  const theme = useTheme()
  return (
    <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.sm }}>
      <View style={[styles.actions, { gap: theme.spacing.sm }]}>
        <View style={styles.accept}>
          <Button label="Schedule it" onPress={onAccept} />
        </View>
        <View style={styles.skip}>
          <Button label="Skip" variant="secondary" onPress={onSkip} />
        </View>
      </View>

      <View
        style={[
          styles.links,
          { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
        ]}
      >
        <Link
          icon={editingTime ? 'checkmark' : 'time-outline'}
          label={editingTime ? 'Done' : 'Change time'}
          onPress={onToggleTime}
        />
        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
        <Link icon="create-outline" label="Edit details" onPress={onEdit} />
      </View>
    </View>
  )
}

/** A text action under the buttons, with a glyph so the two read as a pair of tools. */
const Link = ({
  icon,
  label,
  onPress,
}: {
  readonly icon: string
  readonly label: string
  readonly onPress: () => void
}) => {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        { gap: theme.spacing.xs + 2, paddingTop: theme.spacing.md, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={theme.colors.accentInk} />
      <Text variant="label" tone="accent">
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  when: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row' },
  accept: { flex: 3 },
  skip: { flex: 2 },
  links: { flexDirection: 'row', alignItems: 'stretch' },
  link: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  /** A short vertical hairline between the two links. */
  rule: { width: StyleSheet.hairlineWidth, marginTop: 12 },
})
