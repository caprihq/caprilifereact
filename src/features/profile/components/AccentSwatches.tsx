import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { gradient } from '@/hooks/useWash'
import { ACCENT_NAMES, inkOn, moodFor } from '@/theme'
import type { AccentName } from '@/theme'

/**
 * The mood chooser: White plus six colours, tapped in place.
 *
 * This replaced a modal `Picker`, which is why theme changes felt slow. The colour
 * was applied the instant it was tapped — `UnistylesRuntime.setTheme` is
 * synchronous — but the user was looking at a sheet that then took its own animation
 * to slide away, and on Android a `Modal` is a separate native window, so dismissal
 * costs even more. The change was instant and *invisible* until the sheet had gone.
 *
 * In place, the app repaints under the finger: the wash behind the screen, the card
 * tints and this row's own selection ring all change at once.
 *
 * Aurora's swatch is a gradient rather than a dot, because a single dot cannot say
 * "several hues". It uses full-strength colours; the wash it paints on a screen is a
 * few percent alpha, which in a 32pt circle would look empty.
 */

const ACCENT_LABELS: Record<AccentName, string> = {
  plain: 'White',
  ocean: 'Ocean',
  forest: 'Forest',
  rose: 'Rose',
  midnight: 'Midnight',
  sunset: 'Sunset',
  aurora: 'Aurora',
}

export const AccentSwatches = ({
  accent,
  onSelect,
}: {
  readonly accent: AccentName
  readonly onSelect: (accent: AccentName) => void
}) => {
  const theme = useTheme()
  const selectedMood = moodFor(accent, theme.mode)

  return (
    <View>
      {/* Spread rather than gapped: seven dots have to fit the card at any width. */}
      <View style={styles.row}>
        {ACCENT_NAMES.map((name) => {
          const selected = name === accent
          const mood = moodFor(name, theme.mode)

          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`${ACCENT_LABELS[name]} — ${mood.feeling}`}
              accessibilityState={{ selected }}
              // Generous, because a 34pt circle is smaller than a fingertip.
              hitSlop={theme.spacing.sm}
              onPress={() => onSelect(name)}
              style={styles.target}
            >
              <View
                style={[
                  styles.swatch,
                  // The dot's colour; Aurora overlays a gradient below.
                  { backgroundColor: mood.swatch[0] },
                  // Every dot gets an edge, because White's has no fill to see: on a
                  // white card it would otherwise be an invisible gap in the row.
                  { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
                  // More than one colour means a gradient — Aurora. Built through
                  // `gradient()` rather than inline: that helper carries the
                  // zero-size floor, and without it this dot crashed the process
                  // outright when the row re-rendered on a theme change.
                  mood.swatch.length > 1 && gradient(mood.swatch, 'to bottom right'),
                  selected && {
                    borderColor: theme.colors.textPrimary,
                    borderWidth: 2,
                    // The glow is where the colour is allowed to be obvious.
                    shadowColor: mood.accent,
                    shadowOpacity: 0.6,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 4,
                  },
                ]}
              >
                {selected ? (
                  // Derived from the swatch, not from the theme: White's dot is white,
                  // and a white tick on it is no tick at all.
                  <Ionicons name="checkmark" size={16} color={inkOn(mood.swatch[0])} />
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View style={[styles.caption, { marginTop: theme.spacing.sm }]}>
        <Text variant="body">{ACCENT_LABELS[accent]}</Text>
        <Text variant="caption" tone="secondary">
          {selectedMood.feeling}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  target: { padding: 2 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
})
