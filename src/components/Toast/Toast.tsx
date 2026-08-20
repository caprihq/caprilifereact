import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '../Text'
import { FEEDBACK_DURATION_MS } from '@/config'
import { useTheme } from '@/hooks/useTheme'
import { useFeedbackStore } from '@/store'
import { size } from '@/theme'

/**
 * The single toast, with an optional Undo.
 *
 * Replaces FeedbackProvider. That wrapped the entire tree, so every message
 * re-rendered every screen beneath it; this component is the only subscriber to
 * the feedback store, so a toast now re-renders exactly itself.
 *
 * Rendered once, above the navigator.
 */
export const Toast = () => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const current = useFeedbackStore((state) => state.current)
  const dismiss = useFeedbackStore((state) => state.dismiss)

  // Restarts whenever a new message arrives, so a second toast gets its own
  // full duration rather than inheriting the remainder of the first.
  useEffect(() => {
    if (!current) return
    const timer = setTimeout(dismiss, FEEDBACK_DURATION_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [current, dismiss])

  if (!current) return null

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        theme.elevation.high,
        {
          bottom: insets.bottom + theme.spacing.xl,
          marginHorizontal: theme.spacing.lg,
          backgroundColor: current.isError ? theme.colors.danger : theme.colors.primary,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        },
      ]}
    >
      <Text variant="body" style={{ color: theme.colors.textOnPrimary, flex: 1 }}>
        {current.message}
      </Text>

      {current.undo ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            current.undo?.()
            dismiss()
          }}
          hitSlop={theme.spacing.sm}
        >
          <Text variant="label" style={{ color: theme.colors.textOnPrimary }}>
            Undo
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    minHeight: size.tapTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
