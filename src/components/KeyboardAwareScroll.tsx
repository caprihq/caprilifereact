import { Platform, ScrollView, StyleSheet } from 'react-native'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

import { useKeyboard } from '@/hooks/useKeyboard'
import { size } from '@/theme'

/**
 * A scroll view that keeps the focused field — and the button under it — reachable
 * while the keyboard is up.
 *
 * Every form screen goes through this, because the failure was the same everywhere
 * and hand-solving it per screen is how it drifted apart in the first place.
 *
 * Four decisions, each fixing something that was actually broken:
 *
 * 1. **Centring is dropped while the keyboard is up.** `justifyContent: 'center'`
 *    looks right on an idle screen, but once the keyboard halves the viewport the
 *    centred block is clipped at *both* ends and the scroll offset stays at zero —
 *    so the submit button sits below the fold and scrolling up hits the title
 *    instead. Top alignment while typing means the content simply scrolls.
 *
 * 2. **`automaticallyAdjustKeyboardInsets` on iOS**, and no `KeyboardAvoidingView`.
 *    That prop makes UIKit inset the scroll view and bring the focused field into
 *    view. Combining it with `KeyboardAvoidingView` double-compensates and pushes
 *    fields off the top, which is what made this worse on iOS than on Android.
 *
 * 3. **`keyboardShouldPersistTaps="handled"`**. Without it the first tap on a
 *    visible button only dismisses the keyboard, so the user taps twice and reads
 *    the first tap as the button not working.
 *
 * 4. **A trailing gap** (`extraBottomSpace`), so the last control clears the
 *    keyboard's top edge instead of sitting flush against it.
 *
 * Android needs no manual padding: `windowSoftInputMode="adjustResize"` in the
 * manifest already shrinks the window, and adding padding on top of that leaves a
 * dead band under the form.
 */
/**
 * Where the content sits vertically.
 *
 * Pure and exported so the rule can be tested without a renderer: centring is a
 * nicety for an idle screen and a liability once the keyboard is up, because a
 * centred block taller than the remaining space is clipped at *both* ends with the
 * scroll offset still at zero — the submit button ends up unreachable.
 */
export const resolveJustify = (
  align: 'center' | 'top',
  keyboardVisible: boolean,
): 'center' | 'flex-start' => (align === 'center' && !keyboardVisible ? 'center' : 'flex-start')

export const KeyboardAwareScroll = ({
  children,
  align = 'center',
  extraBottomSpace = size.screenPadding,
  contentStyle,
}: {
  readonly children: ReactNode
  /** `center` only applies while the keyboard is hidden. */
  readonly align?: 'center' | 'top'
  readonly extraBottomSpace?: number
  readonly contentStyle?: StyleProp<ViewStyle>
}) => {
  const keyboard = useKeyboard()
  const justifyContent = resolveJustify(align, keyboard.visible)

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { justifyContent },
        // Top alignment gains a little headroom; centring supplies its own.
        justifyContent === 'flex-start' && styles.topPadding,
        { paddingBottom: extraBottomSpace },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  topPadding: { paddingTop: size.screenPadding },
})
