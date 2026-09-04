import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { NoticeCard } from './NoticeCard'
import { useTheme } from '@/hooks/useTheme'
import { useFeedbackStore } from '@/store'

/**
 * The app-wide notice host, floating above the tabs.
 *
 * Mounted once at the root, so it covers every pushed screen. It cannot cover a
 * *sheet*: `formSheet` and `modal` screens are separate native view controllers
 * presented above the root view, which is why sheets mount `SheetNotice` and this
 * host stands down while one is open — see `feedbackStore.sheetHosts`.
 */
export const Toast = () => {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const current = useFeedbackStore((state) => state.current)
  const sheetHosts = useFeedbackStore((state) => state.sheetHosts)

  if (!current || sheetHosts > 0) return null

  return (
    <NoticeCard
      notice={current}
      style={[
        styles.floating,
        { bottom: insets.bottom + theme.spacing.xl, marginHorizontal: theme.spacing.lg },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', left: 0, right: 0 },
})
