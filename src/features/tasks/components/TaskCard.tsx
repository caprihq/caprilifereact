import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { CategoryIcon } from './CategoryIcon'
import type { AppTheme } from '@/theme'
import type { Task } from '@/types/entities'
import {
  PRIORITY_LABEL,
  bandFor,
  durationLabel,
  subtaskProgress,
  subtitleFor,
} from '../logic/taskPresentation'
import type { PriorityBand } from '../logic/taskPresentation'
import { TaskMeta } from './TaskMeta'

/**
 * A task, with everything the list needs to judge it without opening it.
 *
 * The web card carries the same facts but paints each priority a different pastel
 * background — four card colours competing with a themed app. Here priority is a
 * **rail down the leading edge** plus a small badge, so the card keeps the app's
 * surface and the colour still reads at a glance, including in dark mode where the
 * web's pastels have no equivalent.
 *
 * Colours come from roles (`danger`, `warning`, `accentInk`, `textMuted`) rather
 * than hexes, so a mood change carries the priority scale with it.
 */

type TaskCardProps = {
  readonly task: Task
  readonly nowMs: number
  readonly timeZone: string
  /**
   * Omit inside a swipe row: the row's own press handler covers the card, and a
   * second pressable here would take the touch before any gesture could start.
   */
  readonly onPress?: (() => void) | undefined
  /** Tapping the circle completes; omit for a card that cannot be completed here. */
  readonly onToggle?: (() => void) | undefined
}

const railColour = (band: PriorityBand, theme: AppTheme): string => {
  if (band === 'critical') return theme.colors.danger
  if (band === 'high') return theme.colors.warning
  if (band === 'medium') return theme.colors.accentInk
  return theme.colors.textMuted
}

export const TaskCard = ({ task, nowMs, timeZone, onPress, onToggle }: TaskCardProps) => {
  const theme = useTheme()
  const band = bandFor(task)
  const rail = railColour(band, theme)
  const done = task.status === 'completed'
  const subtitle = subtitleFor(task)
  const duration = durationLabel(task)
  const progress = subtaskProgress(task)

  const surface = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    opacity: done ? 0.6 : 1,
  }

  /** A finished task shows its title and nothing else — see the body below. */
  const detail = done ? null : subtitle

  const Shell = onPress ? Pressable : View

  return (
    <Shell
      {...(onPress
        ? { accessibilityRole: 'button' as const, accessibilityLabel: task.title, onPress }
        : {})}
      style={[styles.card, surface]}
    >
      {/* Priority as a rail rather than a whole tinted card: legible in both modes,
          and it leaves the surface to the theme. */}
      <View style={[styles.rail, { backgroundColor: rail }]} />

      <View
        style={[
          styles.body,
          { padding: done ? theme.spacing.md : theme.spacing.lg, gap: theme.spacing.xs },
        ]}
      >
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          {onToggle ? <DoneToggle done={done} onToggle={onToggle} /> : null}

          <Text
            variant="bodyStrong"
            numberOfLines={2}
            style={[styles.title, done && styles.struck]}
          >
            <CategoryIcon task={task} /> {task.title}
          </Text>
        </View>

        {/*
          A finished task keeps its title and nothing else.
          
          Completed tasks stay in All until they are deleted, so on a long-used
          account they are most of the list — and at full height, with a reason line
          and a chip row apiece, the history crowds out the work. The line that
          explains why something matters has nothing to say once it is done.
        */}
        {detail ? (
          <DetailLine detail={detail} />
        ) : null}

        {done ? null : (
          <ChipRow band={band} rail={rail} duration={duration} progress={progress} />
        )}

        <TaskMeta task={task} nowMs={nowMs} timeZone={timeZone} />
      </View>
    </Shell>
  )
}

/** The tick. Its own component so the card body stays under the branch budget. */
const DoneToggle = ({
  done,
  onToggle,
}: {
  readonly done: boolean
  readonly onToggle: () => void
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? 'Mark not done' : 'Mark done'}
      onPress={onToggle}
      hitSlop={theme.spacing.md}
    >
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={done ? theme.colors.success : theme.colors.border}
      />
    </Pressable>
  )
}

/** Priority badge, length and subtask progress: the at-a-glance row. */
const ChipRow = ({
  band,
  rail,
  duration,
  progress,
}: {
  readonly band: PriorityBand
  readonly rail: string
  readonly duration: string | null
  readonly progress: string | null
}) => {
  const theme = useTheme()

  return (
    <View style={[styles.chips, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: rail,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.spacing.sm,
          },
        ]}
      >
        <Text variant="caption" style={{ color: theme.colors.surface }}>
          {PRIORITY_LABEL[band]}
        </Text>
      </View>

      {duration ? (
        <Text variant="caption" tone="muted">
          {duration}
        </Text>
      ) : null}

      {progress ? (
        <Text variant="caption" tone="muted">
          <Ionicons name="checkbox-outline" size={13} color={theme.colors.textMuted} /> {progress}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * The line under a title: CAPRI's reason, or the task's own description.
 *
 * Its own component because the reason needs a leading icon and the description does
 * not, and expressing that inline took the card past the complexity limit.
 *
 * The icon was 💡. Emoji box out wherever the system font is incomplete, and the line
 * where CAPRI explains itself is the last place to show a missing glyph.
 */
const DetailLine = ({
  detail,
}: {
  readonly detail: { readonly text: string; readonly isReason: boolean }
}) => {
  const theme = useTheme()

  if (!detail.isReason) {
    return (
      <Text variant="caption" tone="muted" numberOfLines={2}>
        {detail.text}
      </Text>
    )
  }

  return (
    <Text variant="caption" tone="accent" numberOfLines={2}>
      <Ionicons name="bulb-outline" size={13} color={theme.colors.accentInk} /> {detail.text}
    </Text>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', overflow: 'hidden' },
  rail: { width: 4 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  struck: { textDecorationLine: 'line-through' },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingVertical: 2 },
})
