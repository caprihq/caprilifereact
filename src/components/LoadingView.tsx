import { ActivityIndicator } from 'react-native'

import { Screen } from './Screen'
import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

type LoadingViewProps = {
  readonly message?: string | undefined
}

/** Full-screen loading state — launch restore, sign-in round trips, fetches. */
export const LoadingView = ({ message }: LoadingViewProps) => {
  const theme = useTheme()

  return (
    <Screen centered style={{ alignItems: 'center' }}>
      <ActivityIndicator size="large" color={theme.colors.accentInk} />
      {message ? (
        <Text variant="body" tone="secondary" align="center" style={{ marginTop: theme.spacing.lg }}>
          {message}
        </Text>
      ) : null}
    </Screen>
  )
}
