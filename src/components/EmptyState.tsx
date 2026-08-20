import { View } from 'react-native'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

type EmptyStateProps = {
  readonly message: string
  /** Optional emoji or short glyph, matching the web client's "🎉" style. */
  readonly glyph?: string
}

/** Inline empty state for cards and lists — not a full screen. */
export const EmptyState = ({ message, glyph }: EmptyStateProps) => {
  const theme = useTheme()

  return (
    <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
      <Text variant="caption" tone="muted" align="center">
        {glyph ? `${message} ${glyph}` : message}
      </Text>
    </View>
  )
}
