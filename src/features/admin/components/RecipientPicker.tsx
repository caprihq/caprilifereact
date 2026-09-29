import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { useTheme } from '@/hooks/useTheme'
import { searchUsers, toggleSelected } from '../logic/recipients'
import type { AdminUser } from '../logic/recipients'

/**
 * Choose who a push goes to.
 *
 * Replaces a single email box, which could only express one of the three things an
 * admin actually needs: everybody, a plan, or a named handful. "Send this to the four
 * people testing it" was impossible, and typing an address from memory is how a test
 * message reaches the wrong person.
 */

type RecipientPickerProps = {
  readonly users: readonly AdminUser[]
  readonly query: string
  readonly onQuery: (next: string) => void
  readonly selected: readonly string[]
  readonly onSelected: (next: readonly string[]) => void
}

export const RecipientPicker = ({
  users,
  query,
  onQuery,
  selected,
  onSelected,
}: RecipientPickerProps) => {
  const theme = useTheme()
  const visible = searchUsers(users, query)

  return (
    <View style={[styles.fill, { gap: theme.spacing.sm }]}>
      <TextField
        label="Search"
        placeholder="Name or email"
        value={query}
        onChangeText={onQuery}
        autoCapitalize="none"
      />

      {/*
        Says what is about to happen. Selecting nobody is a valid and common choice —
        it means "use the audience above" — and an admin needs to see which of the two
        is in force before pressing send.
      */}
      <Text variant="caption" tone="muted">
        {selected.length === 0
          ? 'Nobody picked — the audience above is used'
          : `${String(selected.length)} selected`}
      </Text>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        // The one list whose length is the size of the customer base.
        initialNumToRender={14}
        windowSize={7}
        ListEmptyComponent={
          <Card>
            <Text variant="caption" tone="muted" align="center">
              Nobody matches that
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <RecipientRow
            user={item}
            checked={selected.includes(item.id)}
            onToggle={() => onSelected(toggleSelected(selected, item.id))}
          />
        )}
        contentContainerStyle={{ gap: theme.spacing.xs }}
      />
    </View>
  )
}

/**
 * The list, shown only when asked for.
 *
 * Its own component so the screen body stays inside the 80-line limit (§3.2), and
 * because "open" is the only state it needs from above.
 */
export const RecipientPanel = ({
  open,
  users,
  query,
  onQuery,
  selected,
  onSelected,
}: {
  readonly open: boolean
  readonly users: readonly AdminUser[]
  readonly query: string
  readonly onQuery: (next: string) => void
  readonly selected: readonly string[]
  readonly onSelected: (next: readonly string[]) => void
}) => {
  if (!open) return null

  return (
    <View style={styles.picker}>
      <RecipientPicker
        users={users}
        query={query}
        onQuery={onQuery}
        selected={selected}
        onSelected={onSelected}
      />
    </View>
  )
}

/** One person, and whether they are getting this. */
const RecipientRow = ({
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
  fill: { flex: 1 },
  /** Bounded, so the list scrolls inside the form instead of stretching it. */
  picker: { height: 360 },
  row: { flexDirection: 'row', alignItems: 'center' },
  who: { flex: 1 },
})
