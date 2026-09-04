import { Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * The bar at the top of a sheet: a way back, a title, and a way out.
 *
 * Sheets present modally, so the native stack gives them **no back button** — the
 * only exits are a downward drag and whatever the screen draws itself. That is fine
 * for someone who knows the gesture and a dead end for everyone else, which is what
 * this fixes.
 *
 * Two controls, each with a job:
 *   - **back** appears only when there is a previous step, and returns to it;
 *   - **close** always appears, and dismisses the sheet.
 *
 * Both are round, filled and a full tap target, rather than the bare glyphs a
 * native header would draw — a sheet is a surface of its own and its controls
 * should look deliberate on it.
 *
 * **It does not inset itself.** On a real `formSheet` the sheet already starts below
 * the status bar, so adding the safe-area inset here would push the header down by a
 * notch's worth of nothing. Screens that cover the status bar instead — `Plan`, which
 * is pushed, and `AutoSchedule`, a full modal — add `insets.top` to their own content
 * padding, which is the only place that knows how the screen is presented.
 */

type SheetHeaderProps = {
  readonly title: string
  /** Omit on the first step: there is nowhere back to go. */
  readonly onBack?: (() => void) | undefined
  readonly onClose: () => void
}

export const SheetHeader = ({ title, onBack, onClose }: SheetHeaderProps) => (
  <View style={styles.row}>
    {onBack ? (
      <HeaderControl label="Back" icon="chevron-back" onPress={onBack} />
    ) : (
      // Holds the title centred whether or not there is a back control.
      <View style={styles.slot} />
    )}

    <Text variant="title" align="center" numberOfLines={1} style={styles.title}>
      {title}
    </Text>

    <HeaderControl label="Close" icon="close" onPress={onClose} />
  </View>
)

const HeaderControl = ({
  label,
  icon,
  onPress,
}: {
  readonly label: string
  readonly icon: string
  readonly onPress: () => void
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
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
      <Ionicons name={icon} size={20} color={theme.colors.accentInk} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slot: {
    width: size.tapTarget,
    height: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
})
