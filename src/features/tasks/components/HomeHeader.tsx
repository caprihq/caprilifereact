import { View } from 'react-native'
import { size } from '@/theme'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useCurrentUser } from '@/services/api'

/** Wordmark plus a time-of-day greeting, as on the web Home screen. */
export const HomeHeader = () => {
  const theme = useTheme()
  const { data: user } = useCurrentUser()

  const firstName = (user?.display_name ?? user?.full_name ?? '').split(' ')[0] ?? ''

  return (
    <View
      style={{
        paddingHorizontal: size.screenPadding,
        paddingBottom: theme.spacing.lg,
        gap: theme.spacing.xs,
      }}
    >
      <Text variant="display">CAPRI</Text>
      <Text variant="body" tone="secondary">
        {greetingFor(new Date().getHours())}
        {firstName ? `, ${firstName}` : ''}
      </Text>
    </View>
  )
}

export const greetingFor = (hour: number): string => {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
