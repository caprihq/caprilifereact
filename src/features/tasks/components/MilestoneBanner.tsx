import { StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * Shown once the day's critical and high tasks are all done.
 *
 * The web client asks an LLM for a fresh sentence each time. This does not, and the
 * reason is not cost: a model call to say "well done" is a network round trip that
 * can fail, arrive late, or return something odd — at the exact moment the app is
 * meant to feel effortless. A fixed line is instant and never embarrassing.
 *
 * It appears at the top of Home, above Start Here, because that section is empty by
 * definition when this fires — there is nothing urgent left to start.
 */
export const MilestoneBanner = () => {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.fill,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
    >
      <Ionicons name="trophy-outline" size={24} color={theme.colors.accentInk} />

      <View style={styles.copy}>
        <Text variant="bodyStrong">Everything urgent is done</Text>
        <Text variant="caption" tone="secondary">
          No critical or high-priority work left today. The rest can wait.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1 },
})
