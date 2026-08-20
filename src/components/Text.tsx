import { Text as RNText } from 'react-native'
import type { StyleProp, TextProps as RNTextProps, TextStyle } from 'react-native'

import { useTheme } from '@/hooks/useTheme'
import type { AppTheme } from '@/theme'

/**
 * The only text element in the app.
 *
 * Replaces the pattern of writing `<RNText style={{ fontSize: …, fontWeight: …,
 * color: … }}>` at every call site. Tokens alone kept the *values* consistent;
 * this keeps the *combinations* consistent, which is the job Tailwind classes
 * did for the web client.
 *
 * Import this, never `Text` from react-native.
 */

export type TextVariant =
  | 'display' // screen wordmark
  | 'title' // screen heading
  | 'heading' // section heading
  | 'body' // default copy
  | 'bodyStrong'
  | 'caption' // secondary/supporting
  | 'label' // small emphasis, section titles
  | 'mono' // codes, times

export type TextTone = 'primary' | 'secondary' | 'muted' | 'accent' | 'danger' | 'onAccent'

type TextProps = Omit<RNTextProps, 'style'> & {
  readonly variant?: TextVariant
  readonly tone?: TextTone
  readonly align?: TextStyle['textAlign']
  readonly style?: StyleProp<TextStyle>
}

const variantStyle = (theme: AppTheme, variant: TextVariant): TextStyle => {
  switch (variant) {
    case 'display':
      return { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, letterSpacing: 2 }
    case 'title':
      return { fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold }
    case 'heading':
      return { fontSize: theme.fontSize.lg, fontWeight: theme.fontWeight.bold }
    case 'bodyStrong':
      return { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold }
    case 'caption':
      return { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.regular }
    case 'label':
      return { fontSize: theme.fontSize.sm, fontWeight: theme.fontWeight.semibold }
    case 'mono':
      return {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.semibold,
        fontVariant: ['tabular-nums'],
      }
    case 'body':
      return { fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.regular }
  }
}

const toneColor = (theme: AppTheme, tone: TextTone): string => {
  switch (tone) {
    case 'secondary':
      return theme.colors.textSecondary
    case 'muted':
      return theme.colors.textMuted
    case 'accent':
      // Ink, not the fill: the fill is bright enough to be unreadable as text.
      return theme.colors.accentInk
    case 'danger':
      return theme.colors.danger
    case 'onAccent':
      return theme.colors.textOnAccent
    case 'primary':
      return theme.colors.textPrimary
  }
}

export const Text = ({
  variant = 'body',
  tone = 'primary',
  align,
  style,
  ...rest
}: TextProps) => {
  const theme = useTheme()
  return (
    <RNText
      {...rest}
      style={[
        variantStyle(theme, variant),
        { color: toneColor(theme, tone) },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  )
}
