import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ReactNode } from 'react'

import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { MoodBackground } from '@/components/MoodBackground'
import { size } from '@/theme'

/**
 * The shell every auth form shares: safe area, and a body that stays usable with
 * the keyboard up.
 *
 * Keyboard handling lives in `KeyboardAwareScroll`, which every form screen in the
 * app now uses — the same problem appeared on all of them, so it is solved once.
 * This previously wrapped a `KeyboardAvoidingView`, which fought iOS's own inset
 * adjustment and pushed fields off the top.
 *
 * `align="top"` is for screens that arrive with the keyboard already open — the OTP
 * screen autofocuses its code field — so nothing jumps on first paint.
 */
export const AuthFormLayout = ({
  children,
  align = 'center',
}: {
  readonly children: ReactNode
  readonly align?: 'center' | 'top'
}) => (
    <MoodBackground>
      <SafeAreaView style={styles.root}>
        <KeyboardAwareScroll align={align} contentStyle={styles.padding}>
          {children}
        </KeyboardAwareScroll>
      </SafeAreaView>
    </MoodBackground>
)

const styles = StyleSheet.create({
  root: { flex: 1 },
  padding: { paddingHorizontal: size.screenPadding },
})
