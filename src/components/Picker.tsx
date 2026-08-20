import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * iOS-style option picker in a bottom sheet.
 *
 * Replaces the web client's PickerSheet, which existed for the same reason: a
 * dropdown is the wrong control on a phone.
 */

export type PickerOption<T extends string> = {
  readonly value: T
  readonly label: string
}

type PickerProps<T extends string> = {
  readonly open: boolean
  readonly title?: string
  readonly value: T | undefined
  readonly options: readonly PickerOption<T>[]
  readonly onSelect: (value: T) => void
  readonly onClose: () => void
}

export const Picker = <T extends string>({
  open,
  title,
  value,
  options,
  onSelect,
  onClose,
}: PickerProps<T>) => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          paddingBottom: insets.bottom + theme.spacing.lg,
          paddingTop: theme.spacing.md,
          maxHeight: '70%',
        }}
      >
        <View style={[styles.grabber, { backgroundColor: theme.colors.border }]} />

        {title ? (
          <Text variant="label" tone="secondary" align="center" style={{ marginVertical: theme.spacing.md }}>
            {title}
          </Text>
        ) : null}

        <ScrollView>
          {options.map((option) => {
            const selected = option.value === value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  onSelect(option.value)
                  onClose()
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    minHeight: size.tapTarget,
                    paddingHorizontal: theme.spacing.xl,
                    backgroundColor: pressed ? theme.colors.background : 'transparent',
                  },
                ]}
              >
                <Text variant="body" tone={selected ? 'accent' : 'primary'}>
                  {option.label}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.accentInk} />
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
