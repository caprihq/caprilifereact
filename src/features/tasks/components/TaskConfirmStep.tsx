import { StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { ParsedTask } from '../logic/parseTaskInput'
import { durationLabel, emojiFor } from '../logic/taskPresentation'

/**
 * Step two: what CAPRI understood, before anything is saved.
 *
 * A summary rather than a form. The web client's flow is deliberate here — most
 * captures are correct, so the common path is one glance and one tap, and the full
 * field editor is a link away rather than the default. Landing straight in a form
 * makes every task cost the same effort as a wrong one.
 *
 * Only what was actually extracted is shown: an empty chip row saying "no date, no
 * duration" is noise, and the absence is already visible.
 */

type TaskConfirmStepProps = {
  readonly draft: ParsedTask
  readonly timeZone: string
  readonly saving: boolean
  readonly onSave: () => void
  readonly onEdit: () => void
}

const dueLabel = (iso: string | undefined, timeZone: string): string | null => {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })
}

export const TaskConfirmStep = ({
  draft,
  timeZone,
  saving,
  onSave,
  onEdit,
}: TaskConfirmStepProps) => {
  const theme = useTheme()
  const due = dueLabel(draft.due_date, timeZone)
  const duration = durationLabel(draft)

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Card>
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="bodyStrong">
            {emojiFor(draft)} {draft.title}
          </Text>

          {draft.description ? (
            <Text variant="caption" tone="muted" numberOfLines={3}>
              {draft.description}
            </Text>
          ) : null}

          {due || duration ? (
            <View style={[styles.chips, { gap: theme.spacing.sm }]}>
              {due ? <Chip icon="calendar-outline" label={due} /> : null}
              {duration ? <Chip icon="time-outline" label={duration} /> : null}
            </View>
          ) : null}
        </View>
      </Card>

      <Button label="Save task" icon="checkmark" onPress={onSave} loading={saving} />
      <Button label="Edit details" variant="ghost" icon="chevron-forward" onPress={onEdit} />
    </View>
  )
}

/** One extracted fact. */
const Chip = ({ icon, label }: { readonly icon: string; readonly label: string }) => {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.chip,
        {
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.fill,
          borderRadius: theme.radius.full,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        },
      ]}
    >
      <Ionicons name={icon} size={14} color={theme.colors.textSecondary} />
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center' },
})
