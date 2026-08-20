import { Text } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

type FormErrorProps = {
  readonly message: string | null
  readonly tone?: 'error' | 'notice'
}

/**
 * Inline form feedback. Announced to screen readers via the alert role so a
 * failed sign-in is not silent for VoiceOver users.
 */
export const FormError = ({ message, tone = 'error' }: FormErrorProps) => {
  const theme = useTheme()
  if (!message) return null

  return (
    <Text
      accessibilityRole="alert"
      style={{
        color: tone === 'error' ? theme.colors.danger : theme.colors.textSecondary,
        fontSize: theme.fontSize.sm,
        textAlign: 'center',
        marginTop: theme.spacing.sm,
      }}
    >
      {message}
    </Text>
  )
}
