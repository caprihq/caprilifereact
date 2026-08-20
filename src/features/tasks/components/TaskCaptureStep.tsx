import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { VoiceButton } from './VoiceButton'

/**
 * Step one of capture: a single text box plus the mic.
 *
 * One field on purpose — the fastest path to a saved task is type-and-go, and
 * everything else is inferred then confirmed.
 */

type TaskCaptureStepProps = {
  readonly input: string
  readonly onChangeInput: (text: string) => void
  readonly onNext: () => void
  readonly parsing: boolean
  readonly atFreeLimit: boolean
  readonly voice: {
    readonly listening: boolean
    readonly error: string | null
    readonly limitReached: boolean
    readonly toggle: () => void
  }
  readonly onCancel: () => void
}

export const TaskCaptureStep = ({
  input,
  onChangeInput,
  onNext,
  parsing,
  atFreeLimit,
  voice,
  onCancel,
}: TaskCaptureStepProps) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Text variant="title">What needs doing?</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Task"
            placeholder="e.g. Call the dentist tomorrow, 15 min"
            value={input}
            onChangeText={onChangeInput}
            autoCapitalize="sentences"
            returnKeyType="next"
            onSubmitEditing={onNext}
          />
        </View>
        <VoiceButton
          listening={voice.listening}
          onPress={voice.toggle}
          disabled={voice.limitReached}
        />
      </View>

      {voice.error ? (
        <Text variant="caption" tone="danger">
          {voice.error}
        </Text>
      ) : null}

      <Text variant="caption" tone="muted">
        CAPRI reads dates, durations and priority out of what you write.
      </Text>

      {atFreeLimit ? (
        <Text variant="caption" tone="danger">
          You&apos;ve reached the free plan&apos;s task limit. Upgrade for unlimited tasks.
        </Text>
      ) : null}

      <Button
        label={parsing ? 'Reading…' : 'Next'}
        onPress={onNext}
        loading={parsing}
        disabled={!input.trim() || atFreeLimit}
      />
      <Button label="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  )
}
