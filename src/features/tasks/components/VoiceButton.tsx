import { Pressable, StyleSheet } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'

/** Mic toggle. Turns red while the recognizer is live. */
export const VoiceButton = ({
  listening,
  onPress,
  disabled = false,
}: {
  readonly listening: boolean
  readonly onPress: () => void
  readonly disabled?: boolean
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop recording' : 'Capture task by voice'}
      accessibilityState={{ disabled, busy: listening }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: listening ? theme.colors.danger : theme.colors.accent,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons
        name={listening ? 'stop' : 'mic'}
        size={22}
        color={theme.colors.textOnAccent}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: size.tapTarget,
    height: size.tapTarget,
    borderRadius: size.tapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
