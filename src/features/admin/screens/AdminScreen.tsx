import { size } from '@/theme'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { Picker } from '@/components/Picker'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { RecipientPanel } from '../components/RecipientPicker'
import { recipientSummary, recipientsFor } from '../logic/recipients'
import { useAdminUsers } from '../services/useAdminUsers'
import { useBroadcast, useCompose, useReminderSweep } from '../services/useBroadcast'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
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

/** Shown to anyone who is not an admin. The real gate is server-side. */
const NotAuthorised = () => (
  <View style={{ flex: 1, justifyContent: 'center', padding: size.screenPadding }}>
    <Text variant="heading" align="center">
      Admin access required
    </Text>
  </View>
)

export const AdminScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const { data: user } = useCurrentUser()

  const compose = useCompose()
  const people = useAdminUsers(compose.picking)

  const { send, sending } = useBroadcast({
    title: compose.title,
    body: compose.body,
    recipients: recipientsFor(compose.audience, compose.selected),
    onSent: compose.reset,
  })
  const { runSweep, sweeping } = useReminderSweep()
  /** The plan or "Everyone" behind the audience button, named once and reused. */
  const audienceLabel =
    AUDIENCES.find((a) => a.value === compose.audience)?.label ?? 'Everyone'

  if (user?.role !== 'admin') return <NotAuthorised />

  return (
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, { padding: size.screenPadding, gap: theme.spacing.lg }]}
    >
      <TextField
        label="Title"
        placeholder="Title"
        value={compose.title}
        onChangeText={compose.setTitle}
      />
      <TextField
        label="Body"
        placeholder="Message"
        value={compose.body}
        onChangeText={compose.setBody}
      />

      <Button
        label={`Audience: ${audienceLabel}`}
        variant="secondary"
        onPress={() => compose.setPickerOpen(true)}
      />

      <Button
        label={
          compose.picking
            ? 'Hide people'
            : `Send to: ${recipientSummary(audienceLabel, compose.selected)}`
        }
        variant="secondary"
        onPress={() => compose.setPicking((open) => !open)}
      />

      {/*
        Opened on demand rather than always shown: most sends go to an audience, and
        a list of every customer above the message box buries what the admin came to
        write. Fetching is tied to the same flag, so the list is not loaded at all
        unless someone asks for it.
      */}
      <RecipientPanel
        open={compose.picking}
        users={people.data ?? []}
        query={compose.query}
        onQuery={compose.setQuery}
        selected={compose.selected}
        onSelected={compose.setSelected}
      />

      <Button
        label="Send push"
        onPress={() => void send()}
        loading={sending}
        disabled={!compose.title.trim() || !compose.body.trim()}
      />

      <Button
        label="Run reminder sweep"
        variant="secondary"
        onPress={() => void runSweep()}
        loading={sweeping}
      />

      <Picker
        open={compose.pickerOpen}
        title="Audience"
        value={compose.audience}
        options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
        onSelect={compose.setAudience}
        onClose={() => compose.setPickerOpen(false)}
      />
    </KeyboardAwareScroll>
  )
}
