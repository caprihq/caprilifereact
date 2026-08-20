import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { View } from 'react-native'
import { useNavigation } from '@react-navigation/native'

import { Button } from '@/components/Button'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { DateTimeRow } from '@/components/DateTimeRow'
import { TextField } from '@/components/TextField'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { validateCommitmentDraft } from '@/features/commitments/logic/commitmentDraft'
import { useCurrentUser } from '@/services/api'
import { FormError } from '@/components/FormError/FormError'
import { useCommitmentMutations } from '../services/useCommitmentMutations'

/**
 * Block out time — the native AddCommitmentSheet.
 *
 * Defaults to 9–10am today, matching the web sheet. Validation lives in
 * `validateCommitmentDraft`, so the rules are tested without rendering this.
 */

/** Today at a whole hour, local. */
const todayAt = (hour: number): Date => {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return date
}

export const AddCommitmentScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const navigation = useNavigation()
  const { show } = useFeedback()
  const { data: user } = useCurrentUser()
  const { createCommitment } = useCommitmentMutations(user?.email ?? null, (message) =>
    show({ message, isError: true }),
  )

  const [title, setTitle] = useState('')
  const [day, setDay] = useState(() => new Date())
  const [start, setStart] = useState(() => todayAt(9))
  const [end, setEnd] = useState(() => todayAt(10))
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(() => {
    const result = validateCommitmentDraft({ title, day, start, end })
    if (result.kind === 'invalid') {
      setError(result.message)
      return
    }

    setError(null)
    createCommitment.mutate(result.payload)
    show({ message: 'Commitment added.' })
    navigation.goBack()
  }, [title, day, start, end, createCommitment, show, navigation])

  return (
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, { padding: size.screenPadding, gap: theme.spacing.lg }]}
    >
      <TextField
        label="What is it?"
        placeholder="e.g. Family dinner"
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View style={{ gap: theme.spacing.sm }}>
        <DateTimeRow label="Date" value={day} mode="date" onChange={setDay} />
        <DateTimeRow label="Start" value={start} mode="time" onChange={setStart} />
        <DateTimeRow label="End" value={end} mode="time" onChange={setEnd} />
      </View>

      <FormError message={error} />

      <Button
        label="Save commitment"
        onPress={save}
        loading={createCommitment.isPending}
        disabled={!title.trim() || createCommitment.isPending}
      />
      <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
    </KeyboardAwareScroll>
  )
}
