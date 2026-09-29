import { View } from 'react-native'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * "This is what we had last time" — shown when the screen is drawn from the
 * saved cache because the refresh could not reach the server.
 *
 * Without it the offline cache is quietly dishonest: the list looks live, so a
 * task added on another device is simply missing with nothing to explain why.
 * Deliberately a strip rather than a toast — a toast disappears, and being
 * offline does not.
 */
export const OfflineNotice = () => {
  const theme = useTheme()

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md,
        borderLeftWidth: theme.size.noticeEdge,
        borderLeftColor: theme.colors.warning,
        backgroundColor: theme.colors.surfaceRaised,
      }}
    >
      <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
        Showing your saved tasks. Pull down to try again when you&apos;re back online.
      </Text>
    </View>
  )
}
