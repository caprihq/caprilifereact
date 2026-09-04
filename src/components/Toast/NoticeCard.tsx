import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '../Text'
import { FEEDBACK_DURATION_MS } from '@/config'
import { useTheme } from '@/hooks/useTheme'
import type { AppTheme } from '@/theme'
import { size } from '@/theme'
import { useFeedbackStore } from '@/store'
import type { Feedback, FeedbackTone } from '@/store'

/**
 * One notice, however it is positioned.
 *
 * It used to be a solid slab of colour — the accent for anything that worked, flat
 * red for anything that did not — with the message in white and nothing else. Two
 * problems with that. A saturated fill has to guess at its own ink, and in dark mode
 * the danger colour is a *soft* red, so white text on it measured about 2:1. And with
 * only two states, every message that was neither a success nor a failure had to
 * borrow one: free-plan limits arrived dressed as errors.
 *
 * So it is a card — the app's own surface, with a coloured edge and one glyph
 * carrying the tone, and the message in primary ink at full contrast in both modes.
 * A notice nobody can read is not a notice.
 */

type ToneStyle = {
  readonly icon: string
  readonly colour: (theme: AppTheme) => string
  /** Read out before the message, so the tone is never colour-only. */
  readonly label: string
}

const TONES: Record<FeedbackTone, ToneStyle> = {
  success: { icon: 'checkmark-circle', colour: (t) => t.colors.success, label: 'Done' },
  info: { icon: 'information-circle', colour: (t) => t.colors.accentInk, label: 'Note' },
  warning: { icon: 'warning', colour: (t) => t.colors.warning, label: 'Heads up' },
  error: { icon: 'alert-circle', colour: (t) => t.colors.danger, label: 'Problem' },
}

export const NoticeCard = ({
  notice,
  style,
}: {
  readonly notice: Feedback
  /** Placement only — floating above a screen, or in flow inside a sheet. */
  readonly style?: StyleProp<ViewStyle>
}) => {
  const theme = useTheme()
  const dismiss = useFeedbackStore((state) => state.dismiss)

  // Restarts whenever a new message arrives, so a second notice gets its own full
  // duration rather than inheriting the remainder of the first.
  useEffect(() => {
    const timer = setTimeout(dismiss, FEEDBACK_DURATION_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [notice, dismiss])

  const tone = TONES[notice.tone ?? 'info']
  const colour = tone.colour(theme)

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${tone.label}. ${notice.message}`}
      style={[
        styles.root,
        theme.elevation.high,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      {/* The tone, at a glance, before a word is read. */}
      <View style={[styles.edge, { backgroundColor: colour }]} />

      <View style={[styles.body, { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md }]}>
        <Ionicons name={tone.icon} size={20} color={colour} />

        <Text variant="body" style={styles.message} numberOfLines={3}>
          {notice.message}
        </Text>

        {notice.undo ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo"
            onPress={() => {
              notice.undo?.()
              dismiss()
            }}
            hitSlop={theme.spacing.sm}
          >
            <Text variant="label" style={{ color: theme.colors.accentInk }}>
              Undo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    minHeight: size.tapTarget,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    // Clips the coloured edge to the card's corners.
    overflow: 'hidden',
  },
  edge: { width: 4 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  message: { flex: 1 },
})
