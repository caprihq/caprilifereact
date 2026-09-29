import { View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

type EmptyStateProps = {
  readonly message: string
  /**
   * Optional Ionicons name, drawn above the message.
   *
   * Was an emoji, matching the web client. Emoji arrive as a box with a question
   * mark wherever the system font is incomplete, and cannot take the app's colours;
   * an icon comes from the same font as every other glyph here.
   */
  readonly icon?: string
}

/** Inline empty state for cards and lists — not a full screen. */
export const EmptyState = ({ message, icon }: EmptyStateProps) => {
  const theme = useTheme()

  return (
    <View
      style={{ paddingVertical: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm }}
    >
      {icon ? <Ionicons name={icon} size={22} color={theme.colors.textMuted} /> : null}
      <Text variant="caption" tone="muted" align="center">
        {message}
      </Text>
    </View>
  )
}
