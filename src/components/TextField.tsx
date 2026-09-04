import { useState } from 'react'
import { StyleSheet, TextInput, View } from 'react-native'
import { size } from '@/theme'
import type { TextInputProps } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from './Text'
import { useTheme } from '@/hooks/useTheme'

/**
 * Themed text input.
 *
 * Matches the web client's shadcn field: muted fill, hairline border, 8pt radius,
 * with an optional visible label above and an optional leading icon inside — both
 * of which the native version lacked, so its forms were bare boxes with only a
 * placeholder to identify them. A placeholder disappears as soon as you type,
 * which is exactly when you still want to know what a field is.
 */

type TextFieldProps = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'placeholder'
  | 'autoCapitalize'
  // A pasted token or code must not be "corrected" into something else.
  | 'autoCorrect'
  | 'autoComplete'
  | 'keyboardType'
  | 'textContentType'
  | 'secureTextEntry'
  | 'onSubmitEditing'
  | 'returnKeyType'
  | 'autoFocus'
  | 'selectTextOnFocus'
  | 'numberOfLines'
  // Notes are prose: a task description needs room to breathe.
  | 'multiline'
  | 'textAlignVertical'
> & {
  /** Always the accessibility label; shown above the field when `showLabel`. */
  readonly label: string
  readonly showLabel?: boolean
  /** Ionicons name drawn inside, at the leading edge. */
  readonly icon?: string | undefined
  readonly style?: TextInputProps['style']
}

export const TextField = ({
  label,
  showLabel = false,
  icon,
  style,
  ...inputProps
}: TextFieldProps) => {
  const theme = useTheme()
  // Focus is tracked so the field can take the accent while it is active. The
  // caller's own handlers still run — this wraps them rather than replacing them.
  const [focused, setFocused] = useState(false)
  /**
   * A multiline field grows; a single-line one is a fixed slab.
   *
   * The shell used to be `height: size.control` in both cases, so a taller input
   * inside a row with `alignItems: 'center'` overflowed *above and below* its own
   * border — the placeholder floated outside the box. Growing the shell instead
   * keeps the text centred in whatever height it settles at.
   */
  const grows = inputProps.multiline === true

  return (
    <View>
      {showLabel ? (
        <Text variant="label" tone="secondary" style={{ marginBottom: theme.spacing.sm }}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.shell,
          grows
            ? { minHeight: size.control, paddingVertical: theme.spacing.md }
            : { height: size.control },
          {
            backgroundColor: theme.colors.fill,
            // A focused field takes the accent at full strength; at rest it wears
            // the mood's own hairline.
            borderColor: focused ? theme.colors.accentInk : theme.colors.border,
            borderWidth: focused ? 1.5 : StyleSheet.hairlineWidth,
            borderRadius: theme.radius.lg,
            paddingHorizontal: theme.spacing.lg,
            gap: theme.spacing.md,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            // The icon picks up the accent once the field is active, which is what
            // makes a form feel like it belongs to the chosen mood.
            color={focused ? theme.colors.accentInk : theme.colors.textMuted}
          />
        ) : null}

        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          // `TextFieldProps` deliberately does not expose onFocus/onBlur, so there
          // is no caller handler to chain to here.
          onFocus={() => {
            setFocused(true)
          }}
          onBlur={() => {
            setFocused(false)
          }}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            { color: theme.colors.textPrimary, fontSize: theme.fontSize.lg },
            style,
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    // Centred: with a grown shell this is what puts the text in the middle of the
    // box rather than against its top edge.
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, padding: 0 },
})
