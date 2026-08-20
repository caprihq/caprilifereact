import { View } from 'react-native'

import { Button } from './Button'
import { Screen } from './Screen'
import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

type ErrorViewProps = {
  readonly title?: string
  readonly message: string
  readonly onRetry: () => void
  readonly retryLabel?: string
}

/**
 * Full-screen error with a retry affordance.
 *
 * Retry is always offered: this state is reached on network failure, where
 * trying again is the correct user action. Never a dead end.
 */
export const ErrorView = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorViewProps) => {
  const theme = useTheme()

  return (
    <Screen centered style={{ alignItems: 'center' }}>
      <Text variant="title" align="center" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </Text>
      <Text
        variant="body"
        tone="secondary"
        align="center"
        style={{ marginBottom: theme.spacing.xxl }}
      >
        {message}
      </Text>
      <View style={{ width: '100%', maxWidth: 320 }}>
        <Button label={retryLabel} onPress={onRetry} />
      </View>
    </Screen>
  )
}
