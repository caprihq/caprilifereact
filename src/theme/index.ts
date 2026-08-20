/**
 * Public surface of the theme module.
 *
 * `tokens` is deliberately NOT re-exported. Components consume resolved roles
 * from the theme a style factory receives; naming a palette entry outside this
 * folder is a lint error.
 */
export { ACCENT_NAMES, accentColorFor, isAccentName, moodFor, themeFor, themeNameFor, themes } from './themes'
export { inkOn } from './moods'
export type { Mood } from './moods'
export type { AccentName, AppTheme, ThemeMode } from './themes'
export { breakpoints } from './breakpoints'
export type { AppBreakpoints } from './breakpoints'

/**
 * Dimensional constants. Exported because a module-level StyleSheet has no
 * theme in scope, and a size is a constant rather than a themed role.
 * Colours are NOT exported — those must come from the theme a style receives.
 */
export { size, letterSpacing, fontSize } from './tokens'
