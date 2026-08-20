import { StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'

import { useWash } from '@/hooks/useWash'

/**
 * The screen's background: the chosen mood's wash, drawn behind everything.
 *
 * This is what makes an accent felt rather than merely visible. Before it, picking a
 * colour retinted a few icons while the page stayed flat white — the choice had
 * almost no consequence.
 *
 * Drawn with RN 0.86's `experimental_backgroundImage`, which Fabric renders
 * natively. No gradient library, no native rebuild. The prop is still marked
 * experimental upstream, so a solid `backgroundColor` sits underneath: if a platform
 * ignores the gradient, the screen is a clean background rather than transparent.
 *
 * The wash resolves to the page colour by its final stop, so text always sits on
 * white (or near-black), never on a tint. That is the difference between a mood and
 * a stain.
 */
export const MoodBackground = ({ children }: { readonly children: ReactNode }) => {
  const wash = useWash()

  return <View style={[styles.root, wash]}>{children}</View>
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
