import { useCallback, useState } from 'react'
import { size } from '@/theme'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { Picker } from '@/components/Picker'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { base44 } from '@/services/api'
import { reportError } from '@/services'
import { useCurrentUser } from '@/services/api'

/**
 * Push notification console.
 *
 * The role check here is UX only — sendPushNotification re-checks
 * `role === "admin"` server-side, which is the actual security boundary.
 */

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'free', label: 'Free plan' },
  { value: 'executive', label: 'Executive plan' },
  { value: 'chief_of_staff', label: 'Chief of Staff plan' },
] as const


/**
 * The admin broadcast. Its own hook so the screen reads as a form plus two
 * actions rather than a wall of async plumbing (§3.2).
 */
const useBroadcast = ({
  title,
  body,
  audience,
  onSent,
}: {
  readonly title: string
  readonly body: string
  readonly audience: string
  readonly onSent: () => void
}) => {
  const { show } = useFeedback()
  const [sending, setSending] = useState(false)

  const send = useCallback(async () => {
    setSending(true)
    try {
      const result = (await base44.functions.invoke('sendPushNotification', {
        title,
        body,
        audience,
      })) as { data?: { sent?: number; failed?: number } }

      const sent = result.data?.sent ?? 0
      const failed = result.data?.failed ?? 0
      show({
        message: `Sent ${String(sent)}, failed ${String(failed)}.`,
        tone: failed > 0 ? 'warning' : 'success',
      })
      onSent()
    } catch (error) {
      reportError(error, 'sendPushNotification')
      show({ message: 'Send failed.', tone: 'error' })
    } finally {
      setSending(false)
    }
  }, [title, body, audience, show, onSent])

  return { send, sending }
}

/**
 * Run the reminder sweep now, exactly as the schedule does.
 *
 * The sweep is idempotent and only ever sends what the clock already says is due,
 * so triggering it by hand cannot produce a notification that was not going to
 * happen anyway — it just happens sooner than the next cron tick. It is how
 * reminders get verified without waiting for the schedule, and how you check the
 * schedule is wired at all after a deploy.
 */
const useReminderSweep = () => {
  const { show } = useFeedback()
  const [sweeping, setSweeping] = useState(false)

  const runSweep = useCallback(async () => {
    setSweeping(true)
    try {
      const result = (await base44.functions.invoke('sendPushNotification', {
        mode: 'reminders',
      })) as { data?: { considered?: number; notified?: number; quiet_suppressed?: number } }

      const considered = result.data?.considered ?? 0
      const notified = result.data?.notified ?? 0
      const quiet = result.data?.quiet_suppressed ?? 0
      show({
        message: `Checked ${String(considered)} upcoming, notified ${String(notified)}, quiet ${String(quiet)}.`,
        tone: notified > 0 ? 'success' : 'info',
      })
    } catch (error) {
      reportError(error, 'reminderSweep')
      show({ message: "Couldn't run the reminder sweep.", tone: 'error' })
    } finally {
      setSweeping(false)
    }
  }, [show])

  return { runSweep, sweeping }
}

export const AdminScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const { data: user } = useCurrentUser()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<string>('all')
  const [pickerOpen, setPickerOpen] = useState(false)


  const { send, sending } = useBroadcast({ title, body, audience, onSent: () => { setTitle(''); setBody('') } })
  const { runSweep, sweeping } = useReminderSweep()

  if (user?.role !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: size.screenPadding }}>
        <Text variant="heading" align="center">
          Admin access required
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, { padding: size.screenPadding, gap: theme.spacing.lg }]}
    >
      <TextField label="Title" placeholder="Title" value={title} onChangeText={setTitle} />
      <TextField label="Body" placeholder="Message" value={body} onChangeText={setBody} />

      <Button
        label={`Audience: ${AUDIENCES.find((a) => a.value === audience)?.label ?? 'Everyone'}`}
        variant="secondary"
        onPress={() => setPickerOpen(true)}
      />

      <Button
        label="Send push"
        onPress={() => void send()}
        loading={sending}
        disabled={!title.trim() || !body.trim()}
      />

      <Button
        label="Run reminder sweep"
        variant="secondary"
        onPress={() => void runSweep()}
        loading={sweeping}
      />

      <Picker
        open={pickerOpen}
        title="Audience"
        value={audience}
        options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
        onSelect={setAudience}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAwareScroll>
  )
}
