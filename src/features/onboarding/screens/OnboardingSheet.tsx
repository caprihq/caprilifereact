import { useState } from 'react'
import { Modal, ScrollView, StyleSheet, View } from 'react-native'
import { size } from '@/theme'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import {
  DURATION_OPTIONS,
  FOCUS_OPTIONS,
  WORKING_HOURS_OPTIONS,
} from '../logic/onboardingAnswers'
import type {
  FocusTime,
  OnboardingAnswers,
  TaskDuration,
  WorkingHours,
} from '../logic/onboardingAnswers'
import { OptionRow, StepProgress } from '../components/OnboardingStep'

/**
 * First-run setup: five questions, asked once.
 *
 * The app has no way to plan a day for someone it knows nothing about — working
 * hours, peak energy and typical task length all feed the scorer and the planner,
 * and without them every user runs on the same defaults forever. The web client asks
 * the same five in the same order.
 *
 * **Skippable, and answered once.** Every question has a sensible default already
 * selected, so "Next" four times is a valid path through. Dismissing counts as done:
 * a wizard that returns every launch is one people learn to fight.
 */

const STEPS = [
  {
    id: 'name',
    title: 'What should we call you?',
    // "Optional" stated outright: a field with no asterisk and a live Next button
    // still reads as required to most people, and Apple's guideline is about what
    // the user is made to do, not what the code enforces.
    subtitle: "Optional — we'll use this to personalise CAPRI.",
  },
  {
    id: 'hours',
    title: 'When do you usually work?',
    subtitle: 'CAPRI schedules inside your active hours.',
  },
  {
    id: 'focus',
    title: 'When do you focus best?',
    subtitle: 'Demanding work gets your peak energy.',
  },
  { id: 'duration', title: 'How long are your tasks?', subtitle: 'This shapes the day it plans.' },
] as const

/** Shaped to be spread from `useOnboarding()`, so neither call site rewires it. */
type OnboardingSheetProps = {
  readonly open: boolean
  readonly saving: boolean
  readonly suggestedName: string
  readonly onFinish: (answers: OnboardingAnswers) => void
  readonly skip: () => void
}

export const OnboardingSheet = ({
  open,
  saving,
  suggestedName,
  onFinish,
  skip,
}: OnboardingSheetProps) => {
  const theme = useTheme()
  const wash = useWash()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(suggestedName)
  const [workingHours, setWorkingHours] = useState<WorkingHours>('9:00 AM - 5:00 PM')
  const [focusTime, setFocusTime] = useState<FocusTime>('Morning')
  const [taskDuration, setTaskDuration] = useState<TaskDuration>('30 min')

  const current = STEPS[step] ?? STEPS[0]
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (!isLast) {
      setStep(step + 1)
      return
    }
    onFinish({
      name,
      workingHours,
      focusTime,
      taskDuration,
      // Read from the device: the question the web asks last is one nobody can
      // answer better than the phone can.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={skip}>
      <ScrollView contentContainerStyle={[wash, styles.page, { gap: theme.spacing.lg }]}>
        <StepProgress index={step} total={STEPS.length} />

        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="title">{current.title}</Text>
          <Text variant="body" tone="secondary">
            {current.subtitle}
          </Text>
        </View>

        <StepFields
          step={current.id}
          name={name}
          onName={setName}
          workingHours={workingHours}
          onWorkingHours={setWorkingHours}
          focusTime={focusTime}
          onFocusTime={setFocusTime}
          taskDuration={taskDuration}
          onTaskDuration={setTaskDuration}
        />

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          {/*
            Nothing here is required, including the name.
            
            App Review guideline 4: a user who signs in with Apple must not be made to
            supply a name afterwards. Apple returns one only on the first
            authorisation, and only if the person agrees to share it — so gating this
            button on a non-empty name trapped anyone who declined, or who had signed
            in before, on a step they could not complete or leave.
            
            Personalisation is worth asking for and not worth blocking on: an unnamed
            user is greeted by the time of day instead.
          */}
          <Button label={isLast ? 'Finish setup' : 'Next'} onPress={next} loading={saving} />
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={() => setStep(step - 1)} />
          ) : (
            <Button label="Skip for now" variant="ghost" onPress={skip} />
          )}
        </View>
      </ScrollView>
    </Modal>
  )
}

/** The control for whichever question is on screen. */
const StepFields = ({
  step,
  name,
  onName,
  workingHours,
  onWorkingHours,
  focusTime,
  onFocusTime,
  taskDuration,
  onTaskDuration,
}: {
  readonly step: (typeof STEPS)[number]['id']
  readonly name: string
  readonly onName: (value: string) => void
  readonly workingHours: WorkingHours
  readonly onWorkingHours: (value: WorkingHours) => void
  readonly focusTime: FocusTime
  readonly onFocusTime: (value: FocusTime) => void
  readonly taskDuration: TaskDuration
  readonly onTaskDuration: (value: TaskDuration) => void
}) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {step === 'name' ? (
        <TextField
          label="Your name"
          placeholder="First name"
          value={name}
          onChangeText={onName}
          autoCapitalize="words"
          autoFocus
        />
      ) : null}

      {step === 'hours'
        ? WORKING_HOURS_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              selected={workingHours === option}
              onPress={() => onWorkingHours(option)}
            />
          ))
        : null}

      {step === 'focus'
        ? FOCUS_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              selected={focusTime === option}
              onPress={() => onFocusTime(option)}
            />
          ))
        : null}

      {step === 'duration'
        ? DURATION_OPTIONS.map((option) => (
            <OptionRow
              key={option}
              label={option}
              selected={taskDuration === option}
              onPress={() => onTaskDuration(option)}
            />
          ))
        : null}
    </View>
  )
}


const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: size.screenPadding, justifyContent: 'center' },
})
