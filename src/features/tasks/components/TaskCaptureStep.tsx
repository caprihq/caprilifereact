import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { VoiceButton } from './VoiceButton'

/**
 * Step one: say it, or type it.
 *
 * The mic is the centrepiece rather than a small button beside a field, which is how
 * the web client opens too. The order on screen is the order of preference: speaking
 * a task is faster than typing one, so the screen leads with it and the keyboard is
 * the fallback rather than the default.
 *
 * While the recognizer is live the field shows the running transcript, so the words
 * appear as they are heard instead of arriving in one lump at the end.
 */

type TaskCaptureStepProps = {
  readonly input: string
  readonly onChangeInput: (text: string) => void
  readonly onNext: () => void
  readonly parsing: boolean
  readonly atFreeLimit: boolean
  readonly voice: {
    readonly listening: boolean
    readonly partial: string
    readonly error: string | null
    readonly limitReached: boolean
    readonly toggle: () => void
  }
}

export const captureCaption = (voice: {
  readonly listening: boolean
  readonly limitReached: boolean
}): string => {
  if (voice.listening) return 'Listening… tap to stop'
  if (voice.limitReached) return 'Daily voice limit reached — type below'
  return 'Tap to speak, or type below'
}

export const TaskCaptureStep = ({
  input,
  onChangeInput,
  onNext,
  parsing,
  atFreeLimit,
  voice,
}: TaskCaptureStepProps) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <VoicePrompt voice={voice} />

      <TextField
        label="Task"
        placeholder="What do you need to do?"
        // The live transcript takes over the field while listening, then the final
        // result is written into `input` and the two become one again.
        value={voice.listening && voice.partial ? voice.partial : input}
        onChangeText={onChangeInput}
        autoCapitalize="sentences"
        // Multiline because a spoken task runs longer than a typed one. The field
        // grows with the text and keeps it centred; height is the shell's business,
        // not this caller's.
        multiline
        textAlignVertical="center"
        returnKeyType="next"
        onSubmitEditing={onNext}
      />

      {voice.error ? (
        <Text variant="caption" tone="danger" align="center">
          {voice.error}
        </Text>
      ) : null}

      {atFreeLimit ? (
        <Text variant="caption" tone="danger" align="center">
          You&apos;ve reached the free plan&apos;s task limit. Upgrade for unlimited tasks.
        </Text>
      ) : (
        <ExampleChips />
      )}

      <Button
        label={parsing ? 'Reading…' : 'Continue'}
        icon="sparkles"
        onPress={onNext}
        loading={parsing}
        disabled={!input.trim() || atFreeLimit}
      />
    </View>
  )
}

/**
 * The mic and its caption: the screen's first offer.
 *
 * Kept as one unit and set apart from the typing path below, because the screen
 * offers two ways in and the spacing should say which is which — six elements at
 * even intervals reads as a list of controls rather than a choice.
 */
const VoicePrompt = ({ voice }: { readonly voice: TaskCaptureStepProps['voice'] }) => {
  const theme = useTheme()

  return (
    <View style={[styles.hero, { gap: theme.spacing.xl, paddingVertical: theme.spacing.lg }]}>
      <VoiceButton
        variant="hero"
        listening={voice.listening}
        onPress={voice.toggle}
        disabled={voice.limitReached}
      />

      <Text variant="body" tone={voice.listening ? 'accent' : 'secondary'} align="center">
        {captureCaption(voice)}
      </Text>
    </View>
  )
}


/**
 * What the parser understands, shown by example.
 *
 * "Reads dates, durations and priority" is a claim; "tomorrow 3pm · 30 min ·
 * critical" is a demonstration, and it doubles as a prompt for anyone staring at an
 * empty field.
 */
const ExampleChips = () => {
  const theme = useTheme()

  return (
    <View style={[styles.examples, { gap: theme.spacing.sm }]}>
      {EXAMPLES.map((example) => (
        <View
          key={example}
          style={{
            backgroundColor: theme.colors.fill,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <Text variant="caption" tone="muted">
            {example}
          </Text>
        </View>
      ))}
    </View>
  )
}


/** Real phrases, each demonstrating one thing the parser extracts. */
const EXAMPLES = ['tomorrow 3pm', '30 min', 'critical'] as const

const styles = StyleSheet.create({
  hero: { alignItems: 'center' },
  examples: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
})
