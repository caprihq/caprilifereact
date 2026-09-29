import { size } from '@/theme'
import { View } from 'react-native'

import { Button } from '@/components/Button'
import { Divider } from '@/components/Divider'
import { KeyboardAwareScroll } from '@/components/KeyboardAwareScroll'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useNavigation } from '@react-navigation/native'
import { SelectedRecipients } from '../components/SelectedRecipients'
import { recipientSummary, recipientsFor } from '../logic/recipients'
import { useAdminUsers } from '../services/useAdminUsers'
import { useBroadcast, useReminderSweep } from '../services/useBroadcast'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { useBroadcastStore } from '@/store'
import type { AppNavigation } from '@/navigation'
import { useCurrentUser } from '@/services/api'

/**
 * Push notification console.
 *
 * Two jobs, one screen, kept apart by a rule: writing a message and sending it, and
 * running the reminder job that otherwise runs itself. They share a backend function
 * but nothing else, and reading them as one form is how an admin ends up expecting
 * the sweep to honour the people they just ticked.
 *
 * Deliberately short. Everything needed to send — what it says, who gets it, and the
 * button — fits without scrolling; the list of people that used to sit in the middle
 * now has its own screen. The old plan-shaped audience picker is gone with it: see
 * `recipients.ts` for why it was removed rather than fixed.
 *
 * The role check here is UX only — sendPushNotification re-checks
 * `role === "admin"` server-side, which is the actual security boundary.
 */

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
  const navigation = useNavigation<AppNavigation>()
  const { data: user } = useCurrentUser()

  const draft = useBroadcastStore()
  const people = useAdminUsers()

  const { send, sending } = useBroadcast({
    title: draft.title,
    body: draft.body,
    recipients: recipientsFor(draft.selected),
    onSent: draft.reset,
  })
  const { runSweep, sweeping } = useReminderSweep()

  if (user?.role !== 'admin') return <NotAuthorised />

  return (
    <KeyboardAwareScroll
      align="top"
      contentStyle={[wash, { padding: size.screenPadding, gap: theme.spacing.lg }]}
    >
      <TextField
        label="Title"
        placeholder="Title"
        value={draft.title}
        onChangeText={draft.setTitle}
      />
      <TextField
        label="Body"
        placeholder="Message"
        value={draft.body}
        onChangeText={draft.setBody}
      />

      <SectionLabel>{`Who gets it — ${recipientSummary(draft.selected)}`}</SectionLabel>

      <SelectedRecipients
        users={people.data ?? []}
        selected={draft.selected}
        loading={people.isLoading}
      />

      <Button
        label={draft.selected.length > 0 ? 'Change people' : 'Choose people'}
        variant="secondary"
        onPress={() => { navigation.navigate('SelectRecipients') }}
      />

      <Button
        label="Send push"
        onPress={() => void send()}
        loading={sending}
        disabled={!draft.title.trim() || !draft.body.trim()}
      />

      <Divider />

      <SweepSection onRun={() => void runSweep()} running={sweeping} />
    </KeyboardAwareScroll>
  )
}

/**
 * The reminder job, and what pressing it actually does.
 *
 * Unlabelled, "Run reminder sweep" reads as a second way to send something, sitting
 * as it did right under a send button. It is neither: it sends nobody anything new,
 * and the recipients above have no bearing on it. That is worth three lines of prose
 * next to the button rather than tribal knowledge.
 */
const SweepSection = ({
  onRun,
  running,
}: {
  readonly onRun: () => void
  readonly running: boolean
}) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionLabel>Scheduled reminders</SectionLabel>

      <Text variant="caption" tone="muted">
        Reminders go out on their own every 5 minutes. This runs that same check right
        now, so you can test it without waiting for the next one.
      </Text>
      <Text variant="caption" tone="muted">
        It only delivers reminders that are already due, and never sends one twice — so
        pressing it cannot produce a notification that was not going to happen anyway.
        The message and the people above are not used.
      </Text>

      <Button
        label="Run reminder sweep"
        variant="secondary"
        onPress={onRun}
        loading={running}
      />
    </View>
  )
}
