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

export const AdminScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const { show } = useFeedback()
  const { data: user } = useCurrentUser()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<string>('all')
  const [pickerOpen, setPickerOpen] = useState(false)
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
      show({ message: `Sent ${String(sent)}, failed ${String(failed)}.` })
      setTitle('')
      setBody('')
    } catch (error) {
      reportError(error, 'sendPushNotification')
      show({ message: 'Send failed.', isError: true })
    } finally {
      setSending(false)
    }
  }, [title, body, audience, show])

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
