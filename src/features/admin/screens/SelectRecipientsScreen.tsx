import { FlatList, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { TextField } from '@/components/TextField'
import { size } from '@/theme'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { useBroadcastStore } from '@/store'
import { RecipientRow } from '../components/RecipientRow'
import { searchUsers, toggleSelected } from '../logic/recipients'
import { useAdminUsers } from '../services/useAdminUsers'

/**
 * Pick who a push goes to.
 *
 * Its own screen, because the list is as long as the customer base. Inline on the
 * compose screen it pushed the send button below the fold, so the last thing an admin
 * read before sending was somebody's email address rather than the message. Here the
 * list gets the whole screen and can be virtualised properly — nested inside the
 * compose form's ScrollView it could not be.
 *
 * Edits the shared draft directly, so there is nothing to hand back on the way out
 * and no way to lose a selection by leaving with the back gesture.
 */
export const SelectRecipientsScreen = () => {
  const theme = useTheme()
  const wash = useWash()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const { data, isLoading } = useAdminUsers()
  const query = useBroadcastStore((s) => s.query)
  const setQuery = useBroadcastStore((s) => s.setQuery)
  const selected = useBroadcastStore((s) => s.selected)
  const setSelected = useBroadcastStore((s) => s.setSelected)

  const users = data ?? []
  const visible = searchUsers(users, query)

  return (
    <View style={[styles.fill, wash]}>
      <View style={[styles.header, { padding: size.screenPadding, gap: theme.spacing.sm }]}>
        <TextField
          label="Search"
          placeholder="Name or email"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.summary}>
          <Text variant="caption" tone="muted" style={styles.grow}>
            {selected.length === 0
              ? 'Nobody picked — the push goes to everyone'
              : `${String(selected.length)} picked`}
          </Text>

          {/* Both ways out of a long list without scrolling it: take everybody
              currently matching the search, or start again. */}
          <Button
            label="Select all"
            variant="ghost"
            onPress={() => { setSelected(visible.map((user) => user.id)) }}
          />
          {selected.length > 0 ? (
            <Button label="Clear" variant="ghost" onPress={() => { setSelected([]) }} />
          ) : null}
        </View>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        // The one list whose length is the size of the customer base.
        initialNumToRender={14}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: size.screenPadding,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.xs,
        }}
        ListEmptyComponent={
          <Text variant="caption" tone="muted" align="center">
            {isLoading ? 'Loading people…' : 'Nobody matches that'}
          </Text>
        }
        renderItem={({ item }) => (
          <RecipientRow
            user={item}
            checked={selected.includes(item.id)}
            onToggle={() => { setSelected(toggleSelected(selected, item.id)) }}
          />
        )}
      />

      {/* Pinned rather than scrolled to: the way out of a list this long must not
          depend on reaching the end of it. */}
      <View
        style={{
          padding: size.screenPadding,
          paddingBottom: insets.bottom + theme.spacing.md,
        }}
      >
        <Button label="Done" onPress={() => { navigation.goBack() }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flex: 1 },
  header: { width: '100%' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
