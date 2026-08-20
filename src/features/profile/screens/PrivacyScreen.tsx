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
    body: 'Your tasks, commitments and scheduling preferences, plus the email address you signed in with. Nothing else is collected.',
  },
  {
    heading: 'Who can see it',
    body: 'Only you. Task and commitment records are scoped to the account that created them and enforced server-side.',
  },
  {
    heading: 'AI features',
    body: 'When you use AI prioritisation or voice capture, the relevant task text is sent to our AI provider to generate a recommendation. It is not used to train models.',
  },
  {
    heading: 'Calendar',
    body: 'If you connect Google Calendar, CAPRI reads today’s events to avoid overloading your day. It never writes to your calendar.',
  },
  {
    heading: 'Deleting your data',
    body: 'Contact support from the Profile tab and we will remove your account and everything in it.',
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
