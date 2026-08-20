import { Pressable, StyleSheet } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useTheme } from '@/hooks/useTheme'

/** Floating add button, sitting clear of the tab bar. */
export const AddTaskButton = ({ onPress }: { readonly onPress: () => void }) => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add new task"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent,
          bottom: insets.bottom + theme.spacing.xl,
          right: theme.spacing.xl,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <Ionicons name="add" size={30} color={theme.colors.textOnAccent} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: size.tapTarget + 12,
    height: size.tapTarget + 12,
    borderRadius: (size.tapTarget + 12) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
})
