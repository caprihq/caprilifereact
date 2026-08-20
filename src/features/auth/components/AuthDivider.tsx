import { StyleSheet, View } from 'react-native'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * The "OR" rule between provider buttons and email.
 *
 * Feature-local: only the login screen has two ways in to separate. It moves to
 * `src/components/` if a second feature ever needs one (rule 2).
 */
export const AuthDivider = ({ label = 'OR' }: { readonly label?: string }) => {
  const theme = useTheme()

  return (
    <View style={styles.root}>
      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
      <Text variant="caption" tone="muted" style={{ marginHorizontal: theme.spacing.md }}>
        {label}
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center' },
  // Hairline rather than a border, so it renders identically on both platforms.
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
})
