import { StyleSheet, View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

/**
 * A hairline rule between two groups of controls that do unrelated things.
 *
 * Spacing alone reads as "these belong together, loosely". Where the next control
 * would do something the one above it never does — sending a written message versus
 * running a scheduled job — a rule is what stops the two being read as one form.
 */
export const Divider = () => {
  const theme = useTheme()

  return (
    <View
      style={[styles.rule, { backgroundColor: theme.colors.border }]}
      // Decoration: it separates for the eye, and there is a section heading
      // underneath it that does the same job for a screen reader.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  )
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth, width: '100%' },
})
