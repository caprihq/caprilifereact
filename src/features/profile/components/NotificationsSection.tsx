import { useCallback, useState } from 'react'
import { Switch } from 'react-native'

import { Card } from '@/components/Card'
import { Picker } from '@/components/Picker'
import { Row } from '@/components/Row'
import { useFeedback } from '@/hooks/useFeedback'
import { registerForPush } from '@/features/auth'
import { HOUR_OFF, QUIET_HOURS, quietHourLabel } from '../logic/hours'
import type { EditableProfile } from '../services/useUserProfile'
import type { User } from '@/types/entities'

/**
 * Notification settings, and the one place iOS permission is actually asked for.
 *
 * The switch used to write `notification_enabled` and nothing else, so turning
 * notifications "on" changed a database row while iOS had never been asked for
 * permission — the app was configured to notify and permanently unable to. Enabling
 * now registers the device, which is what triggers the system prompt.
 *
 * Quiet hours had the mirror problem: the backend sweep reads
 * `notification_quiet_hours_start/end` and honours them in the user's own timezone,
 * and there was no way to set them. A preference only the server can see is not a
 * preference.
 */
export const NotificationsSection = ({
  user,
  onChange,
}: {
  readonly user: User | undefined
  readonly onChange: (changes: Partial<EditableProfile>) => void
}) => {
  const { show } = useFeedback()
  const [sheet, setSheet] = useState<'quiet-start' | 'quiet-end' | null>(null)
  const close = () => setSheet(null)

  const enabled = user?.notification_enabled !== false

  const onToggle = useCallback(
    async (notification_enabled: boolean) => {
      onChange({ notification_enabled })
      if (!notification_enabled) return

      // Returns false when iOS refuses — which is a state the user has to fix in
      // Settings, so saying nothing would leave them expecting reminders forever.
      const registered = await registerForPush()
      if (!registered) {
        show({
          message: 'Turn on notifications for CAPRI in Settings to get reminders.',
          tone: 'warning',
        })
      }
    },
    [onChange, show],
  )

  return (
    <>
      <Card flush>
        <Row
          label="Allow notifications"
          accessory={
            <Switch
              value={enabled}
              onValueChange={(next) => void onToggle(next)}
              accessibilityLabel="Allow notifications"
            />
          }
        />
        <Row
          label="Quiet hours start"
          value={quietHourLabel(user?.notification_quiet_hours_start)}
          onPress={() => setSheet('quiet-start')}
        />
        <Row
          label="Quiet hours end"
          value={quietHourLabel(user?.notification_quiet_hours_end)}
          onPress={() => setSheet('quiet-end')}
          last
        />
      </Card>

      <Picker
        open={sheet === 'quiet-start'}
        title="Quiet hours start"
        value={user?.notification_quiet_hours_start ?? HOUR_OFF}
        options={QUIET_HOURS}
        onSelect={(value) => onChange({ notification_quiet_hours_start: value })}
        onClose={close}
      />
      <Picker
        open={sheet === 'quiet-end'}
        title="Quiet hours end"
        value={user?.notification_quiet_hours_end ?? HOUR_OFF}
        options={QUIET_HOURS}
        onSelect={(value) => onChange({ notification_quiet_hours_end: value })}
        onClose={close}
      />
    </>
  )
}
