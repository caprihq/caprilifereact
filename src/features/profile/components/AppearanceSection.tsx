import { StyleSheet, View } from 'react-native'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useThemeStore } from '@/store'
import { AccentSwatches } from './AccentSwatches'
import { ModeChoice } from './ModeChoice'

/**
 * Appearance: one card, two settings.
 *
 * They were two separate cards, and that separation was the problem users reported —
 * a row of coloured dots in its own box does not announce itself as a *theme*
 * control, and a second box below it made the pair look unrelated. Together under
 * one heading, each half labelled, they read as what they are: the two halves of how
 * the app looks.
 *
 * Reads the *choice* from the store rather than the resolved theme: "system" is a
 * real third option, and a resolved theme cannot tell you whether dark was chosen or
 * merely inherited from the OS. Each selector subscribes to one field, so changing
 * the colour does not re-render the mode row.
 */
export const AppearanceSection = () => {
  const theme = useTheme()
  const accent = useThemeStore((state) => state.accent)
  const mode = useThemeStore((state) => state.mode)
  const setAccent = useThemeStore((state) => state.setAccent)
  const setMode = useThemeStore((state) => state.setMode)

  return (
    <Card>
      <Text variant="body" style={{ fontWeight: theme.fontWeight.semibold }}>
        Theme
      </Text>
      <Text variant="caption" tone="secondary" style={{ marginTop: theme.spacing.xs }}>
        A colour tints the whole app — background, buttons and fields. White keeps it
        plain.
      </Text>

      <View style={{ marginTop: theme.spacing.lg }}>
        <AccentSwatches accent={accent} onSelect={setAccent} />
      </View>

      <View
        style={[
          styles.divider,
          {
            backgroundColor: theme.colors.border,
            marginVertical: theme.spacing.lg,
          },
        ]}
      />

      <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
        Light or dark
      </Text>
      <ModeChoice mode={mode} onSelect={setMode} />
    </Card>
  )
}

const styles = StyleSheet.create({
  // A hairline rather than a gap: it says "same card, second setting".
  divider: { height: StyleSheet.hairlineWidth },
})
