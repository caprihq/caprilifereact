import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'

import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { useNow } from '@/hooks/useNow'
import { useAddTask } from '../hooks/useAddTask'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { TaskCaptureStep } from '../components/TaskCaptureStep'
import { TaskFieldsForm } from '../components/TaskFieldsForm'

/**
 * Two-step capture, mirroring the web AddTaskSheet's input → confirm flow.
 *
 * Step two exists because the LLM will occasionally misread a date, and
 * silently saving a wrong due date is worse than asking.
 */
export const AddTaskScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation()
  const nowMs = useNow()
  const close = useCallback(() => navigation.goBack(), [navigation])

  const { parse, save, parsing, atFreeLimit, isSaving } = useAddTask(close)
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<ParsedTask | null>(null)
  const [usedVoice, setUsedVoice] = useState(false)

  const voice = useVoiceCapture((text) => {
    setInput(text)
    setUsedVoice(true)
  })

  const onNext = useCallback(async () => {
    if (!input.trim()) return
    // Counted only once the capture actually produced something usable.
    if (usedVoice) voice.recordUse(nowMs)
    setDraft(await parse(input))
  }, [input, parse, usedVoice, voice, nowMs])

  return (
    <View style={[styles.fill, wash]}>
      <KeyboardAwareScroll
        align="top"
        contentStyle={{ padding: size.screenPadding, gap: theme.spacing.lg }}
      >
        {draft ? (
          <TaskFieldsForm
            draft={draft}
            onChange={setDraft}
            onBack={() => setDraft(null)}
            onSave={() => save(draft)}
            saving={isSaving}
          />
        ) : (
          <TaskCaptureStep
            input={input}
            onChangeInput={setInput}
            onNext={() => void onNext()}
            parsing={parsing}
            atFreeLimit={atFreeLimit}
            voice={{
              listening: voice.listening,
              error: voice.error,
              limitReached: voice.limitReached,
              toggle: () => void voice.toggle(),
            }}
            onCancel={close}
          />
        )}
      </KeyboardAwareScroll>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
