import { StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareScroll } from './KeyboardAwareScroll'
import { MoodBackground } from './MoodBackground'


/**
 * Standard screen container: safe area, themed background, gutter.
 *
 * Every screen previously repeated
 * `<SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>`
 * plus its own padding constant. This owns that once.
 */

type ScreenProps = {
  readonly children: ReactNode
  /** Vertically centre the content — used by auth and status screens. */
  readonly centered?: boolean
  /** Wrap in a ScrollView. Off by default; list screens bring their own. */
  readonly scroll?: boolean
  /** Drop the horizontal gutter, for edge-to-edge lists. */
  readonly flush?: boolean
  readonly style?: StyleProp<ViewStyle>
  /** Which edges the safe area applies to. Tab screens skip the bottom. */
  readonly edges?: readonly ('top' | 'bottom' | 'left' | 'right')[]
}

export const Screen = ({
  children,
  centered = false,
  scroll = false,
  flush = false,
  style,
  edges = ['top', 'left', 'right'],
}: ScreenProps) => {
  const content: StyleProp<ViewStyle> = [
    styles.fill,
    !flush && { paddingHorizontal: size.screenPadding },
    centered && styles.centered,
    style,
  ]

  return (
    <MoodBackground>
      <SafeAreaView edges={edges} style={styles.fill}>
      {scroll ? (
        // Keyboard handling is shared with every other form in the app: a focused
        // field and the button under it must both stay reachable, and centring is
        // dropped while the keyboard is up because it clips both ends.
        <KeyboardAwareScroll
          align={centered ? 'center' : 'top'}
          contentStyle={[!flush && { paddingHorizontal: size.screenPadding }, style]}
        >
          {children}
        </KeyboardAwareScroll>
      ) : (
        <View style={content}>{children}</View>
      )}
      </SafeAreaView>
    </MoodBackground>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  centered: { justifyContent: 'center' },
})
