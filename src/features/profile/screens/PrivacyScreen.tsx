import { ScrollView, StyleSheet } from 'react-native'
import { size } from '@/theme'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { base44Config } from '@/config'

/**
 * Privacy policy.
 *
 * Apple fetches the App Store Connect privacy URL logged-out, and a user who
 * cannot sign in still needs to read this — so it must never sit behind the
 * auth gate. The canonical copy lives at public-site/privacy.html; this
 * summarises it and links out.
 */

const SECTIONS = [
  {
    heading: 'What we store',
    body: 'Your tasks, commitments and scheduling preferences, and the email address you signed in with. If you turn on reminders we store an identifier for your device so notifications can reach it, and we keep a record of when AI features run — the feature used, whether it succeeded, and how long it took — to account for their cost. Crash reports contain no personal data. We also record which features are used and which screens are opened, so we can see what is working — counts and choices only, never the words you write.',
  },
  {
    heading: 'Who can see it',
    body: 'Only you. Task and commitment records are scoped to the account that created them and enforced server-side.',
  },
  {
    heading: 'AI features',
    body: 'When you use AI prioritisation, voice capture or subtasks, the task text is sent to our AI provider to generate a recommendation, along with your working hours and how full your day already is so the answer fits your schedule. It is not used to train models.',
  },
  {
    heading: 'Calendar',
    body: 'If you connect Google Calendar, CAPRI reads when you are busy over the coming week — times only, never event titles — so it can plan around your commitments. It writes to your calendar only for time blocks you accept from Smart Auto-Schedule, and never touches anything else.',
  },
  {
    heading: 'Deleting your data',
    body: 'Delete account, at the bottom of the Profile tab, removes your account and everything in it permanently. You do not need to ask us.',
  },
]

export const PrivacyScreen = () => {
  const theme = useTheme()
  const wash = useWash()

  return (
    <ScrollView
      contentContainerStyle={[wash, styles.page, { gap: theme.spacing.lg }]}
    >
      <Text variant="title">Privacy</Text>

      {SECTIONS.map((section) => (
        <Text key={section.heading} variant="body" tone="secondary">
          <Text variant="bodyStrong">{section.heading}{'\n'}</Text>
          {section.body}
        </Text>
      ))}

      <Text variant="caption" tone="muted">
        Full policy: {base44Config.appBaseUrl}/privacy
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  /** Fills the viewport even when the content is short, so the wash reaches the bottom. */
  page: { flexGrow: 1, padding: size.screenPadding },
})
