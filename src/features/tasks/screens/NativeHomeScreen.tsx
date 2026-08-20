import { useCallback, useMemo, useState } from 'react'
import { size } from '@/theme'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { ErrorView } from '@/components/ErrorView'
import { LoadingView } from '@/components/LoadingView'
import { useConfirmExit } from '@/hooks/useHardwareBack'
import { useTheme } from '@/hooks/useTheme'
import { useWash } from '@/hooks/useWash'
import { usePlan } from '@/hooks/usePlan'
import { loadSignals } from '../logic/signalsStore'
import type { AppNavigation } from '@/navigation/types'
import { AddTaskButton } from '../components/AddTaskButton'
import { useHomeActions } from '../hooks/useHomeActions'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { HomeHeader } from '../components/HomeHeader'
import { HomeSections } from '../components/HomeSections'

/**
 * Native Home — hero, Up Next, Today's Plan, commitments and the full task list.
 *
 * Task creation and detail open as native form sheets from the stack above the
 * tabs. Actions and their behavioural signals live in useHomeActions.
 */
export const NativeHomeScreen = () => {
  const theme = useTheme()

  // Back here would otherwise finish the activity, which reads as a crash.
  useConfirmExit()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const feed = useTaskFeed()
  const { hasAccess } = usePlan()
  const actions = useHomeActions(feed)
  const [refreshing, setRefreshing] = useState(false)

  // Read once per pass and shared by every reason line, rather than each
  // component hitting storage on its own.
  const signals = useMemo(
    () => loadSignals(feed.nowMs, feed.allTasks.filter((task) => task.status === 'completed')),
    [feed.nowMs, feed.allTasks],
  )

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    feed.refetch()
    setRefreshing(false)
  }, [feed])

  if (feed.isLoading) return <LoadingView message="Loading your tasks…" />

  if (feed.isError) {
    return (
      <ErrorView
        title="Couldn't load your tasks"
        message="Check your connection and try again."
        onRetry={feed.refetch}
      />
    )
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.fill, wash]}
    >
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: size.screenPadding,
          paddingBottom: theme.spacing.xxxl * 2,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HomeSections
          feed={feed}
          signals={signals}
          actions={actions}
          showStats={hasAccess('analytics')}
        />
      </ScrollView>

      <AddTaskButton onPress={() => navigation.navigate('AddTask')} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
