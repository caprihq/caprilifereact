import Ionicons from 'react-native-vector-icons/Ionicons'

import { useTheme } from '@/hooks/useTheme'
import { iconFor } from '../logic/taskPresentation'

/**
 * The small glyph before a task's title.
 *
 * Replaces the category emoji. Emoji do not render on every iOS build — they arrive
 * as a box with a question mark wherever the system font is incomplete, which showed
 * on every task row — and they cannot take the app's colours.
 *
 * Nested inside the title's `Text` rather than placed beside it: `Ionicons` renders a
 * `Text` itself, so it sits on the same line and wraps with the words instead of
 * needing a row and its own alignment rules at five call sites.
 */
export const CategoryIcon = ({
  task,
}: {
  readonly task: { readonly category?: string | undefined }
}) => {
  const theme = useTheme()

  return <Ionicons name={iconFor(task)} size={14} color={theme.colors.textMuted} />
}
