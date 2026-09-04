import { StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useFeedback } from '@/hooks/useFeedback'
import { useTheme } from '@/hooks/useTheme'
import { usePlan } from '@/hooks/usePlan'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'
import { useCalendarConnection } from '../hooks/useCalendarConnection'
import { CalendarConnectorRow } from './CalendarConnectorRow'

/**
 * Calendar integrations for the Profile screen.
 *
 * Google Calendar needs the `calendar_sync` entitlement. The Outlook row is a
 * deliberate "coming soon" placeholder carried over from the web client, so the
 * roadmap stays visible rather than looking like a missing feature.
 */

type CalendarIntegrationsSectionProps = {
  readonly onUpgrade: () => void
}

export const CalendarIntegrationsSection = ({ onUpgrade }: CalendarIntegrationsSectionProps) => {
  const theme = useTheme()
  const { show } = useFeedback()
  const { hasAccess } = usePlan()
  const unlocked = hasAccess('calendar_sync')
  const calendar = useCalendarConnection(unlocked, (message) => show({ message, tone: 'error' }))

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <SectionLabel>Calendar Integrations</SectionLabel>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
        }}
      >
        <CalendarConnectorRow
          label="Google Calendar"
          icon="calendar"
          unlocked={unlocked}
          status={calendar.status}
          working={calendar.working}
          onConnect={() => void calendar.connect()}
          onDisconnect={() => void calendar.disconnect()}
          onUpgrade={onUpgrade}
        />

        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="mail-outline" size={22} color={theme.colors.textMuted} />
          <View style={styles.body}>
            <Text variant="body" tone="secondary">
              Microsoft / Outlook
            </Text>
            <Text variant="caption" tone="muted">
              Coming soon
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.tapTarget },
  body: { flex: 1, gap: 2 },
})
