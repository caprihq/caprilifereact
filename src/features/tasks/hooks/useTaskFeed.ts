import { useMemo } from 'react'

import { useNow } from '@/hooks/useNow'

import { loadSignals } from '../logic/signalsStore'
import { rankTasks } from '@/features/tasks/logic/capriScoring'
import { filterTodayPlanTasks } from '@/features/tasks/logic/plannerLogic'
import { isActiveTask } from '@/features/tasks/logic/taskFilters'
import type { Task } from '@/types/entities'
import { useCurrentUser } from '@/services/api'
import { useTasks } from '../services/taskQueries'

/**
 * Everything the Home screen needs, derived in one place.
 *
 * The clock is captured once per computation rather than read inside
 * comparators, and behavioural signals are loaded once and passed down — the
 * two things that made the web scorer slow and untestable.
 */

export type TaskFeed = {
  readonly isLoading: boolean
  /**
   * Nothing to show **and** the fetch failed — the only case that earns a
   * full-screen error.
   *
   * Deliberately not `query.isError`. Since the cache is restored from disk, a
   * failed refresh usually happens with a perfectly good task list already on
   * screen, and blanking it for "Couldn't load your tasks" would throw away the
   * exact thing the saved copy exists to provide.
   */
  readonly isError: boolean
  /**
   * Drawn from the saved copy because the refresh could not reach the server.
   *
   * The screen has to say so. Silently serving yesterday's list looks identical
   * to a live one, so a task added elsewhere is simply absent with no explanation.
   */
  readonly isShowingSaved: boolean
  /**
   * Awaitable on purpose: a pull-to-refresh spinner has to stay up until the data
   * arrives, and a fire-and-forget refetch gives it nothing to wait on.
   */
  readonly refetch: () => Promise<void>
  readonly userEmail: string | null
  readonly timeZone: string
  readonly allTasks: readonly Task[]
  /** Highest-ranked actionable task — the "Start Here" hero. */
  readonly heroTask: Task | null
  /** Next best three, excluding the hero. */
  readonly upNext: readonly Task[]
  /**
   * The hero and the three behind it, in local ranking order.
   *
   * Shown until the model answers, and whenever it cannot. Includes the hero: CAPRI
   * decides what to start, so the question has to offer it the local engine's pick.
   */
  readonly ranked: readonly Task[]
  /**
   * Every task CAPRI may recommend — open work, minus scheduled events.
   *
   * The recommender is given this rather than `ranked` because a shortlist of four
   * makes the model's judgement almost decorative: it could only reorder what the
   * local scorer had already chosen, and the prompt's rule about anything due within
   * two days could never surface a task the local pass had ranked fifth.
   */
  readonly actionable: readonly Task[]
  /** Scheduled or due today, plus the hero if it has no today anchor. */
  readonly todayTasks: readonly Task[]
  /** Fixed to the moment the feed was computed, so all views agree. */
  readonly nowMs: number
}

export const useTaskFeed = (): TaskFeed => {
  const { data: user } = useCurrentUser()
  const userEmail = user?.email ?? null
  const tasksQuery = useTasks(userEmail)

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data])

  // Stable within a render, refreshed on a timer and on foreground — see
  // useNow. Reading Date.now() here would break React's purity rule.
  const nowMs = useNow()

  return useMemo(() => {
    const timeZone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

    const completed = tasks.filter((task) => task.status === 'completed')
    const signals = loadSignals(nowMs, completed)

    // Scheduled events are commitments, not work to rank. `isActiveTask` is the
    // shared definition the filter bar also uses — this file used to keep its
    // own copy of the status list, which could drift from it.
    const actionable = tasks.filter((task) => isActiveTask(task) && !task.is_scheduled_event)

    const ranked = rankTasks(actionable, { nowMs, limit: 4, signals })
    const heroTask = ranked[0]?.task ?? null
    const upNext = ranked.slice(1, 4).map((entry) => entry.task)

    const { todayTasks, recommendedExtra } = filterTodayPlanTasks(tasks, {
      nowMs,
      timeZone,
      recommendedTaskId: heroTask?.id ?? null,
    })

    return {
      isLoading: tasksQuery.isLoading,
      isError: tasksQuery.isError && tasksQuery.data === undefined,
      isShowingSaved: tasksQuery.isError && tasksQuery.data !== undefined,
      refetch: async () => {
        await tasksQuery.refetch()
      },
      userEmail,
      timeZone,
      allTasks: tasks,
      heroTask,
      upNext,
      ranked: ranked.map((entry) => entry.task),
      actionable,
      todayTasks: [...todayTasks, ...recommendedExtra],
      nowMs,
    }
  }, [tasks, user?.timezone, userEmail, tasksQuery, nowMs])
}
