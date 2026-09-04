import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { useNavigation } from '@react-navigation/native'
import type { AppNavigation } from '@/navigation/types'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { SheetHeader } from '@/components/SheetHeader'
import { SheetNotice } from '@/components/Toast'

import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import type { ParsedTask } from '@/features/tasks/logic/parseTaskInput'
import { useNow } from '@/hooks/useNow'
import { useTimeZone } from '@/hooks/useTimeZone'
import { useAddTask } from '../hooks/useAddTask'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { TaskCaptureStep } from '../components/TaskCaptureStep'
import { TaskConfirmStep } from '../components/TaskConfirmStep'
import { usePlan } from '@/hooks/usePlan'
import type { GatedFeature } from '@/features/profile'
import { UpgradePrompt, useUpgradePrompt } from '@/features/profile'
import { TaskFieldsForm } from '../components/TaskFieldsForm'

/**
 * Capture in three steps, matching the web client: **say it → check it → save**.
 *
 *   1. `TaskCaptureStep` — the mic, front and centre, with typing as the fallback.
 *   2. `TaskConfirmStep` — what CAPRI understood, as a summary.
 *   3. `TaskFieldsForm`  — every field, reached from "Edit details".
 *
 * The middle step is the point of the flow and was missing: capture went straight to
 * a full form, so every task cost the same effort as a misread one. Most captures are
 * correct, so the common path should be a glance and a tap.
 *
 * **`KeyboardAwareScroll` is the screen root, and the wash goes on its content.**
 * Wrapping it in a `<View style={{ flex: 1 }}>` is the obvious thing to write and it
 * renders an empty sheet: `presentation: 'formSheet'` gives the screen no definite
 * height, so a `flex: 1` wrapper measures zero, and the scroll view inside it clips
 * everything away — silently, with no error, on iOS only. Probing it showed plain
 * sibling views overflowing the collapsed wrapper and drawing on top of each other.
 * `AddCommitmentScreen`, the other sheet, has always been written this way.
 */
export const AddTaskScreen = () => {
  const { hasAccess } = usePlan()
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const nowMs = useNow()
  const close = useCallback(() => navigation.goBack(), [navigation])

  const { parse, save, parsing, atFreeLimit, isSaving } = useAddTask(close)
  const timeZone = useTimeZone()
  const upgrade = useUpgradePrompt()
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<ParsedTask | null>(null)
  const [editing, setEditing] = useState(false)
  const [usedVoice, setUsedVoice] = useState(false)

  const voice = useVoiceCapture((text) => {
    setInput(text)
    setUsedVoice(true)
  })

  const step = draft === null ? 'capture' : editing ? 'edit' : 'confirm'

  /** One step back: edit → confirm → capture. Undefined on the first step. */
  const back =
    step === 'capture'
      ? undefined
      : () => {
          if (step === 'edit') setEditing(false)
          else setDraft(null)
        }

  /** Flattened for the step, which should not know the hook's shape. */
  const voiceProps = {
    listening: voice.listening,
    error: voice.error,
    partial: voice.partial,
    limitReached: voice.limitReached,
    toggle: () => void voice.toggle(),
  }

  const onNext = useCallback(async () => {
    if (!input.trim()) return
    // Counted only once the capture actually produced something usable.
    if (usedVoice) voice.recordUse(nowMs)
    setDraft(await parse(input))
  }, [input, parse, usedVoice, voice, nowMs])

  return (
    <KeyboardAwareScroll
      // Top-aligned at every step now that the sheet is sized to its content:
      // centring inside a three-quarter sheet reintroduces the gap it was meant
      // to remove.
      align="top"
      contentStyle={[
        wash,
        {
          padding: size.screenPadding,
          paddingBottom: theme.spacing.xxl,
          gap: theme.spacing.lg,
        },
      ]}
    >
      <SheetHeader title={STEP_TITLE[step]} onBack={back} onClose={close} />

      {/* Sheets sit above the root view, so the floating toast cannot reach them. */}
      <SheetNotice />

      <CaptureFlow
        step={step}
        draft={draft}
        onDraft={setDraft}
        onEdit={setEditing}
        timeZone={timeZone}
        saving={isSaving}
        onSave={(draft) => void save(draft)}
        capture={{ input, onChangeInput: setInput, onNext, parsing, atFreeLimit, voice: voiceProps }}
        recurrenceLocked={!hasAccess('recurring_tasks')}
        onUpgrade={upgrade.prompt}
      />

      <UpgradePrompt {...upgrade} />
    </KeyboardAwareScroll>
  )
}

/**
 * Whichever step is current. Split from the screen so each body stays inside the
 * 80-line limit (§3.2) and the screen reads as flow state plus one element.
 */
const CaptureFlow = ({
  step,
  draft,
  onDraft,
  onEdit,
  timeZone,
  saving,
  onSave,
  capture,
  recurrenceLocked,
  onUpgrade,
}: {
  readonly step: 'capture' | 'confirm' | 'edit'
  readonly draft: ParsedTask | null
  readonly onDraft: (draft: ParsedTask) => void
  readonly onEdit: (editing: boolean) => void
  readonly timeZone: string
  readonly saving: boolean
  readonly onSave: (draft: ParsedTask) => void
  readonly capture: Omit<Parameters<typeof TaskCaptureStep>[0], 'onNext'> & {
    readonly onNext: () => Promise<void>
  }
  readonly recurrenceLocked: boolean
  readonly onUpgrade: (feature: GatedFeature) => void
}) => {
  if (draft && step === 'edit') {
    return (
      <TaskFieldsForm
        draft={draft}
        onChange={onDraft}
        recurrenceLocked={recurrenceLocked}
        onUpgrade={() => onUpgrade('recurring_tasks')}
        onSave={() => onSave(draft)}
        saving={saving}
      />
    )
  }

  if (draft) {
    return (
      <TaskConfirmStep
        draft={draft}
        timeZone={timeZone}
        saving={saving}
        onSave={() => onSave(draft)}
        onEdit={() => onEdit(true)}
      />
    )
  }

  return <TaskCaptureStep {...capture} onNext={() => void capture.onNext()} />
}


/** What the header says at each step, mirroring the web modal's own headings. */
const STEP_TITLE = {
  capture: 'New task',
  confirm: 'Looks right?',
  edit: 'Edit details',
} as const
