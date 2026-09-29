import { Pressable, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons'
import { size } from '@/theme'

import { AppLogo } from '@/components/AppLogo'
import { Text } from '@/components/Text'
import { useTheme } from '@/hooks/useTheme'
import { useCurrentUser } from '@/services/api'
import { firstNameOf } from '@/features/profile/logic/displayName'
import type { AppNavigation } from '@/navigation/types'

/**
 * Logo, greeting, and the way through to every task.
 *
 * The logo is the artwork, not the word typed in a display font — the brand had
 * been rendering two different ways in the same app.
 *
 * One action on the right: **All tasks**, replacing the full list that used to sit at
 * the foot of Home below four other sections, where reaching it meant scrolling past
 * everything else. This is how the web client gets there too.
 *
 * A second button briefly lived here for adding a commitment, because Today's
 * Commitments hides itself on an empty day. It is gone: Add Task carries the
 * "Scheduled event" toggle now, which is the web client's route to the same thing, so
 * the shortcut was a second way to do one job.
 */
export const HomeHeader = () => {
  const theme = useTheme()
  const navigation = useNavigation<AppNavigation>()
  const { data: user } = useCurrentUser()

  // Null rather than a username: see `realName`.
  const firstName = firstNameOf(user)

  return (
    <View
      style={[
        styles.row,
        { paddingHorizontal: size.screenPadding, paddingBottom: theme.spacing.lg },
      ]}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <AppLogo height={30} />
        <Text variant="body" tone="secondary">
          {greetingFor(new Date().getHours())}
          {firstName ? `, ${firstName}` : ''}
        </Text>
      </View>

      {/*
        Two ways out of Home, because there were two screens with one door between
        them. The planner was reachable only through "View Full Plan" inside Today's
        Plan — one link, on one card, that renders only when there is a plan to
        show — so a whole screen could be invisible on the day you most wanted it.
      */}
      <View style={[styles.actions, { gap: theme.spacing.xs }]}>
        <HeaderAction
          label="Daily planner"
          icon="calendar-outline"
          onPress={() => navigation.navigate('Planner')}
        />
        <HeaderAction
          label="All tasks"
          icon="list-outline"
          onPress={() => navigation.navigate('AllTasks')}
        />
      </View>
    </View>
  )
}

/** The header's round icon button. */
const HeaderAction = ({
  label,
  icon,
  onPress,
}: {
  readonly label: string
  readonly icon: string
  readonly onPress: () => void
}) => {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      // Generous, because the glyph is smaller than a fingertip.
      hitSlop={theme.spacing.sm}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: theme.colors.fill,
          borderRadius: theme.radius.full,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.colors.accentInk} />
    </Pressable>
  )
}

export const greetingFor = (hour: number): string => {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  action: {
    height: size.tapTarget,
    width: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
