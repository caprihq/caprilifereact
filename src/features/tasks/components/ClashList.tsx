import { Pressable, StyleSheet, View } from 'react-native'
import Ionicons from 'react-native-vector-icons/Ionicons'

import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import type { ClashItem } from '../logic/clashItems'

/**
 * Clashes, each with its fixes — on the planner (today) and the review screen (week).
 *
 * CAPRI never moves a time the user chose, or a meeting, on its own. What it can do
 * is make the clash impossible to miss and the fix one tap away: let CAPRI find a
 * new time, pick one yourself, or say it is fine to keep both.
 */

type ClashListProps = {
  readonly heading: string
  readonly items: readonly ClashItem[]
  readonly onFindTime: (taskId: string) => void
  readonly onChangeTime: (taskId: string) => void
  readonly onKeepBoth: (key: string) => void
}

const Action = ({ label, onPress }: { readonly label: string; readonly onPress: () => void }) => {
  const theme = useTheme()
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={theme.spacing.sm}>
      <Text variant="label" tone="accent">
        {label}
      </Text>
    </Pressable>
  )
}

export const ClashList = ({ heading, items, onFindTime, onChangeTime, onKeepBoth }: ClashListProps) => {
  const theme = useTheme()
  if (items.length === 0) return null

  return (
    <Card>
      <View style={{ gap: theme.spacing.md }}>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
          <Text variant="bodyStrong">{heading}</Text>
        </View>

        {items.map((item) => (
          <View key={item.key} style={{ gap: theme.spacing.xs }}>
            <Text variant="body" numberOfLines={1}>
              {item.title}
            </Text>
            <Text variant="caption" tone="danger">
              {item.detail}
            </Text>
            <View style={[styles.row, { gap: theme.spacing.lg }]}>
              <Action label="Find a new time" onPress={() => onFindTime(item.taskId)} />
              <Action label="Change time" onPress={() => onChangeTime(item.taskId)} />
              <Action label="Keep both" onPress={() => onKeepBoth(item.key)} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  )
}

/** "1 overlap today", "3 overlaps this week". */
export const clashHeading = (count: number, when: string): string =>
  `${String(count)} ${count === 1 ? 'overlap' : 'overlaps'} ${when}`

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
})
