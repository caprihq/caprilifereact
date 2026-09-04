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

        <PickerHeader title={title} onClose={onClose} />

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

/**
 * The picker's title and its way out.
 *
 * The backdrop dismisses too, but that is a gesture you have to already know —
 * without a visible control the only obvious exit was to pick something, which is
 * not the same as changing your mind.
 */
const PickerHeader = ({
  title,
  onClose,
}: {
  readonly title: string | undefined
  readonly onClose: () => void
}) => {
  const theme = useTheme()

  return (
    <View style={[styles.header, { marginVertical: theme.spacing.sm }]}>
      <View style={styles.slot} />

      <Text variant="label" tone="secondary" align="center" style={styles.title}>
        {title ?? ''}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={onClose}
        hitSlop={theme.spacing.sm}
        style={({ pressed }) => [
          styles.slot,
          {
            backgroundColor: theme.colors.fill,
            borderRadius: theme.radius.full,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        <Ionicons name="close" size={18} color={theme.colors.accentInk} />
      </Pressable>
    </View>
  )
}


const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: size.screenPadding },
  slot: {
    width: size.tapTarget,
    height: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
