import { View } from 'react-native'

import { Card } from '@/components/Card'
import { Row } from '@/components/Row'
import { useTheme } from '@/hooks/useTheme'
import type { User } from '@/types/entities'
import type { EditableProfile } from '../services/useUserProfile'
import { AppearanceSection } from './AppearanceSection'
import { NotificationsSection } from './NotificationsSection'
import { PreferencesSection } from './PreferencesSection'
import { SectionLabel } from '@/components/SectionLabel/SectionLabel'

/**
 * Every settings group below the identity card. Extracted so ProfileScreen
 * stays a thin composition (guidelines §3.2).
 */

export type ProfileRoutes = {
  readonly onPlan: () => void
  readonly onSupport: () => void
  readonly onPrivacy: () => void
  readonly onAdmin: () => void
  readonly onChangePassword: () => void
  readonly onRestartSetup: () => void
}

type ProfileSettingsListProps = {
  readonly user: User | undefined
  readonly planLabel: string
  readonly isPaid: boolean
  readonly onChange: (changes: Partial<EditableProfile>) => void
  readonly routes: ProfileRoutes
}

export const ProfileSettingsList = ({
  user,
  planLabel,
  isPaid,
  onChange,
  routes,
}: ProfileSettingsListProps) => {
  const theme = useTheme()

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <SectionLabel>Plan</SectionLabel>
      <Card flush>
        <Row label="Current plan" value={planLabel} />
        <Row label={isPaid ? 'Manage subscription' : 'Upgrade'} onPress={routes.onPlan} last />
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <PreferencesSection user={user} onChange={onChange} />
      <Card flush>
        {/* Re-asks the five first-run questions. They write the same fields the rows
            above edit, so this is a faster path to all of them at once — and the
            only way to see the wizard after a profile has been answered. */}
        <Row label="Run setup again" onPress={routes.onRestartSetup} last />
      </Card>

      <SectionLabel>Appearance</SectionLabel>
      <AppearanceSection />

      <SectionLabel>Notifications</SectionLabel>
      <NotificationsSection user={user} onChange={onChange} />

      <SectionLabel>Help</SectionLabel>
      <Card flush>
        <Row label="Change password" onPress={routes.onChangePassword} />
        <Row label="Contact support" onPress={routes.onSupport} />
        <Row label="Privacy policy" onPress={routes.onPrivacy} last />
      </Card>

      {user?.role === 'admin' ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionLabel>Admin</SectionLabel>
          <Card flush>
            <Row label="Push notifications" onPress={routes.onAdmin} last />
          </Card>
        </View>
      ) : null}
    </View>
  )
}
