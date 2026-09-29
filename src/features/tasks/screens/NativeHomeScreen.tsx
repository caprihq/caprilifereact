import { useEffect, useCallback, useMemo, useState } from 'react'
import { size } from '@/theme'
import { RefreshControl, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { ErrorView } from '@/components/ErrorView'
import { LoadingView } from '@/components/LoadingView'
import { useConfirmExit } from '@/hooks/useHardwareBack'
import { useContentBottom } from '@/hooks/useContentBottom'
import { useWash } from '@/hooks/useWash'
import { loadSignals } from '../logic/signalsStore'
import type { AppNavigation } from '@/navigation/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { OfflineNotice } from '@/components/OfflineNotice'
import { OnboardingSheet, useOnboarding } from '@/features/onboarding'
import { AddTaskButton } from '../components/AddTaskButton'
import { useHomeActions } from '../hooks/useHomeActions'
import { useTaskFeed } from '../hooks/useTaskFeed'
import { useUpNext } from '../hooks/useUpNext'
import { useWidgetSnapshot } from '../hooks/useWidgetSnapshot'
import { reportTimeToUsable } from '@/services/startup/startupTiming'
import { HomeHeader } from '../components/HomeHeader'
import { HomeSections } from '../components/HomeSections'

/**
 * Native Home — hero, Up Next, Today's Plan, commitments and the full task list.
 *
 * Task creation and detail open as native form sheets from the stack above the
 * tabs. Actions and their behavioural signals live in useHomeActions.
 */
export const NativeHomeScreen = () => {
  const contentBottom = useContentBottom(true)

  // Back here would otherwise finish the activity, which reads as a crash.
  useConfirmExit()
  const wash = useWash()
  const navigation = useNavigation<AppNavigation>()
  const feed = useTaskFeed()
  // Every open task is offered, and the local top four carry the screen until the
  // answer arrives. The hero is among them: CAPRI decides what to start, so leaving
  // the local pick out would take that choice away from it.
  const upNext = useUpNext({
    candidates: feed.actionable,
    shortlist: feed.ranked,
    userEmail: feed.userEmail,
    nowMs: feed.nowMs,
    timeZone: feed.timeZone,
  })
  // Ordered after `upNext` on purpose: the ignored signal has to be recorded against
  // the hero the user actually saw.
  const actions = useHomeActions(feed, upNext.hero?.task.id ?? feed.heroTask?.id ?? null)
  const onboarding = useOnboarding()

  // The first moment the app is usable rather than merely visible.
  useEffect(() => {
    if (!feed.isLoading) void reportTimeToUsable('home')
  }, [feed.isLoading])

  // Hand the home-screen widget exactly what this screen is showing, so the two can
  // never disagree about what to start.
  useWidgetSnapshot({
    hero: upNext.hero?.task ?? feed.heroTask,
    upNext: upNext.entries.map((entry) => entry.task),
    // Everything CAPRI may rank, not just the four on screen: the widget says
    // "+N more" from this.
    totalOpen: feed.actionable.length,
    nowMs: feed.nowMs,
    ready: !feed.isLoading && !feed.isError,
  })
  const [refreshing, setRefreshing] = useState(false)

  // Read once per pass and shared by every reason line, rather than each
  // component hitting storage on its own.
  const signals = useMemo(
    () => loadSignals(feed.nowMs, feed.allTasks.filter((task) => task.status === 'completed')),
    [feed.nowMs, feed.allTasks],
  )

  /**
   * Awaited, or the spinner never shows: setting `refreshing` true and false in the
   * same tick is batched into one render, so the control snapped back before the
   * refetch had left the device and a pull looked like it did nothing.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await feed.refetch()
    setRefreshing(false)
  }, [feed])

  if (feed.isLoading) return <LoadingView message="Loading your tasks…" />

  if (feed.isError) {
    return (
      <ErrorView
        title="Couldn't load your tasks"
        message="Check your connection and try again."
        onRetry={() => void feed.refetch()}
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
          // Clears the translucent native tab bar and the home indicator.
          paddingBottom: contentBottom,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        {feed.isShowingSaved ? <OfflineNotice /> : null}
        <HomeSections feed={feed} signals={signals} actions={actions} upNext={upNext} />
      </ScrollView>

      <AddTaskButton onPress={() => navigation.navigate('AddTask')} />

      <ConfirmDialog {...actions.completionPrompt} />

      <OnboardingSheet {...onboarding} onFinish={(answers) => void onboarding.finish(answers)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
