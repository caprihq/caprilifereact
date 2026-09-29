import { Switch } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

/**
 * A switch in the app's own colours.
 *
 * React Native's `Switch` ships with the platform's palette: a grey track when off
 * and iOS system green when on. On a tinted card the grey pill reads as a *disabled*
 * control rather than an enabled one that happens to be off, which is exactly how
 * the "Scheduled event" setting was being misread — people could not tell whether it
 * was switched off or switched off-limits.
 *
 * Carrying the accent makes the on state unmistakable and ties the control to the
 * chosen theme, and the explicit off colours give the track enough contrast against
 * a pale surface to read as live.
 */

type ToggleProps = {
  readonly value: boolean
  readonly onChange: (next: boolean) => void
  readonly label: string
  readonly disabled?: boolean
}

export const Toggle = ({ value, onChange, label, disabled = false }: ToggleProps) => {
  const theme = useTheme()

  return (
    <Switch
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
      thumbColor={theme.colors.surface}
      // Android only; iOS derives it from the track.
      ios_backgroundColor={theme.colors.border}
      style={{ opacity: disabled ? 0.4 : 1 }}
    />
  )
}
