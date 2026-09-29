import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { AdminUser } from '../logic/recipients'

/** One person, and whether they are getting this. */
export const RecipientRow = ({
  user,
  checked,
  onToggle,
}: {
  readonly user: AdminUser
  readonly checked: boolean
  readonly onToggle: () => void
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={user.display_name || user.email}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.row,
        {
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.surface,
          gap: theme.spacing.md,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={checked ? theme.colors.accentInk : theme.colors.textMuted}
      />
      <View style={styles.who}>
        {/* The name when there is one; the email is what makes it unambiguous. */}
        <Text variant="body" numberOfLines={1}>
          {user.display_name || user.email}
        </Text>
        {user.display_name ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {user.email}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" tone="muted">
        {user.plan}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  who: { flex: 1 },
})
