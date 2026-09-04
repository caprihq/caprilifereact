import { Pressable, StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

import { useTheme } from '@/hooks/useTheme'
import { gradient } from '@/theme'

/**
 * Rounded surface used for every grouped block.
 *
 * Three things make it a card rather than a bordered box, and it previously had
 * none of them:
 *
 *  - **Its own gradient.** A flat white rectangle on a strongly washed page looks
 *    pasted on. `cardWash` runs a hint of the mood from the top edge down to
 *    nothing, so the surface catches the colour of the page it sits on while text
 *    still lands on something opaque.
 *  - **A 22pt corner.** Large enough to read as a card at a glance; `xl` (16) reads
 *    as a rounded panel.
 *  - **A shadow in the mood's own ink.** A black shadow under a tinted page goes
 *    grey and dirty — the reason the old cards looked smudged rather than raised.
 *    Tinting it costs nothing and is most of why this now looks deliberate.
 *
 * In dark mode a shadow against a dark ground is invisible, so a hairline border
 * does the separating instead — the standard trick, and the reason this cannot just
 * be one shared style object.
 */

type CardProps = {
  readonly children: ReactNode
  /** Makes the whole card a button. */
  readonly onPress?: (() => void) | undefined
  /** Remove inner padding when the card hosts its own rows. */
  readonly flush?: boolean
  /** Drop the shadow, for a card nested inside another surface. */
  readonly flat?: boolean
  readonly style?: StyleProp<ViewStyle>
  readonly accessibilityLabel?: string | undefined
}

export const Card = ({
  children,
  onPress,
  flush = false,
  flat = false,
  style,
  accessibilityLabel,
}: CardProps) => {
  const theme = useTheme()
  const isDark = theme.mode === 'dark'

  const base: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xxl,
      padding: flush ? 0 : theme.spacing.lg,
      /**
       * Never clipped. A flush card used to set `overflow: 'hidden'` to cut its
       * rows' corners, and on Android that silently breaks: children paint on
       * first mount and then **vanish** on any later update, leaving a card of
       * the right height with nothing in it. It went unnoticed until the theme
       * became a re-render — every settings list emptied itself the moment a
       * colour was picked.
       *
       * Nothing inside needs the clip anyway: `Row` dims rather than fills when
       * pressed, so no child paints a square corner over a round one. iOS also
       * clips a shadow along with content, so dropping this restores elevation
       * there as a side effect.
       */
      overflow: 'visible',
    },
    // The card's share of the mood, over the opaque surface.
    gradient(theme.cardWash),
    flat
      ? null
      : {
          ...theme.elevation.medium,
          // Ink rather than black: a neutral shadow over a coloured page reads as
          // dirt. Dark mode has no visible shadow, so it keeps a plain dark one.
          shadowColor: isDark ? theme.colors.background : theme.colors.accentInk,
        },
    // Shadows do not read on a dark ground; a hairline edge does.
    isDark && !flat
      ? { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }
      : null,
    style,
  ]

  if (!onPress) return <View style={base}>{children}</View>

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.7 }]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {},
})
