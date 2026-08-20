import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { size } from '@/theme'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { ConnectionState } from '../services/calendarConnection'

/**
 * One calendar provider row: name, connection state, and the action.
 *
 * Presentational. Locked rows show a padlock and route to the plan screen
 * rather than hiding, so the capability stays discoverable.
 */

type CalendarConnectorRowProps = {
  readonly label: string
  readonly icon: string
  readonly unlocked: boolean
  readonly status: ConnectionState | 'checking'
  readonly working: boolean
  readonly onConnect: () => void
  readonly onDisconnect: () => void
  readonly onUpgrade: () => void
}

const statusLabel = (status: ConnectionState | 'checking'): string => {
  if (status === 'checking') return 'Checking…'
  return status === 'connected' ? 'Connected' : 'Not connected'
}

export const CalendarConnectorRow = ({
  label,
  icon,
  unlocked,
  status,
  working,
  onConnect,
  onDisconnect,
  onUpgrade,
}: CalendarConnectorRowProps) => {
  const theme = useTheme()
  const connected = status === 'connected'

  return (
    <Pressable
      disabled={unlocked}
      onPress={onUpgrade}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${unlocked ? statusLabel(status) : 'locked'}`}
      style={[styles.row, { padding: theme.spacing.lg, gap: theme.spacing.md }]}
    >
      <Ionicons name={icon} size={22} color={unlocked ? theme.colors.accentInk : theme.colors.textMuted} />

      <View style={styles.body}>
        <Text variant="body">{label}</Text>
        <Text variant="caption" tone={unlocked && connected ? 'accent' : 'muted'}>
          {unlocked ? statusLabel(status) : 'Upgrade to connect your calendar'}
        </Text>
      </View>

      {!unlocked ? (
        <Ionicons name="lock-closed-outline" size={16} color={theme.colors.textMuted} />
      ) : working || status === 'checking' ? (
        <ActivityIndicator color={theme.colors.accentInk} />
      ) : (
        <Text
          variant="label"
          tone={connected ? 'danger' : 'accent'}
          onPress={connected ? onDisconnect : onConnect}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.tapTarget },
  body: { flex: 1, gap: 2 },
})
