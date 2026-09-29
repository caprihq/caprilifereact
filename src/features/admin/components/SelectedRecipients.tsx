import { ScrollView, StyleSheet, View } from 'react-native'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { selectedUsers } from '../logic/recipients'
import type { AdminUser } from '../logic/recipients'

/**
 * Who the message is addressed to, on the compose screen.
 *
 * Bounded on purpose. The recipients used to be listed in full here, which meant the
 * screen grew with the customer base and the send button — the one control the screen
 * exists for — sat below the fold before anything had been typed. A fixed height caps
 * that: past three or four people the box scrolls on its own and the page does not.
 *
 * Read-only. Ticking and unticking belongs to the picker screen; this is the receipt.
 */

/** Roughly four rows. Enough to recognise a test group at a glance without scrolling. */
const MAX_HEIGHT = 156

export const SelectedRecipients = ({
  users,
  selected,
  loading = false,
}: {
  readonly users: readonly AdminUser[]
  readonly selected: readonly string[]
  readonly loading?: boolean
}) => {
  const theme = useTheme()

  if (selected.length === 0) {
    return (
      <Text variant="caption" tone="muted">
        Going to everyone. Choose people to send to a smaller group instead.
      </Text>
    )
  }

  const picked = selectedUsers(users, selected)

  return (
    <View
      style={[
        styles.box,
        {
          maxHeight: MAX_HEIGHT,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.xs }}
        // Inside a form that scrolls: keep the gesture here once it starts.
        nestedScrollEnabled
      >
        {picked.length === 0 && loading ? (
          <Text variant="caption" tone="muted">
            {`${String(selected.length)} picked — loading names…`}
          </Text>
        ) : (
          picked.map((user) => (
            <Text key={user.id} variant="caption" numberOfLines={1}>
              {user.display_name || user.email}
            </Text>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', width: '100%' },
})
