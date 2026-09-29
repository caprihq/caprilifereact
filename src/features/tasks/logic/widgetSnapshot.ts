import { WIDGET_SNAPSHOT_SCHEMA } from '../../../../modules/capri-app-group/constants'
import type { Task } from '@/types/entities'

/**
 * What the home-screen widget draws, taken from what the app is already showing.
 *
 * The point is agreement. The widget used to ask the backend for its own ranking, so
 * it could disagree with Home about what to start — a different "Start Here" on the
 * home screen than inside the app, for up to half an hour. Publishing the app's own
 * hero and queue makes that impossible.
 *
 * Deliberately small: a title, a priority, a duration and a due date per task, and
 * nothing else. This store is unencrypted, so it holds only what the widget already
 * displays on an unlocked home screen — never a token, never notes.
 *
 * `due` travels so the widget can re-derive "overdue" as the clock passes midnight,
 * without a refresh and without asking anyone.
 */

export type WidgetTask = {
  readonly id: string
  readonly title: string
  readonly priority: string
  readonly minutes: number | null
  readonly due: string | null
}

export type WidgetSnapshot = {
  readonly schema: number
  readonly publishedAt: string
  readonly hero: WidgetTask | null
  readonly upNext: readonly WidgetTask[]
  /**
   * Open tasks beyond the hero and the rows actually sent.
   *
   * The widget shows a couple of rows at most, and without this it cannot tell the
   * difference between "that is everything" and "there are eleven more". A count
   * lets it say so in a line, instead of a list that quietly stops.
   */
  readonly moreCount: number
}

const toWidgetTask = (task: Task): WidgetTask => ({
  id: task.id,
  title: task.title,
  priority: task.priority ?? 'medium',
  minutes: task.estimated_minutes ?? null,
  due: task.due_date ?? null,
})

/** How many queue rows travel. The medium widget draws two; the third is headroom. */
const SENT_ROWS = 3

export const buildWidgetSnapshot = (input: {
  readonly hero: Task | null
  readonly upNext: readonly Task[]
  readonly nowMs: number
  /**
   * Every open task, so the widget can count what it is not showing. Optional: a
   * caller that does not know simply gets a count of nothing more.
   */
  readonly totalOpen?: number
}): WidgetSnapshot => {
  const upNext = input.upNext.slice(0, SENT_ROWS).map(toWidgetTask)
  const shown = (input.hero ? 1 : 0) + upNext.length

  return {
    schema: WIDGET_SNAPSHOT_SCHEMA,
    publishedAt: new Date(input.nowMs).toISOString(),
    hero: input.hero ? toWidgetTask(input.hero) : null,
    upNext,
    moreCount: Math.max(0, (input.totalOpen ?? shown) - shown),
  }
}

/**
 * Has anything the widget can see actually changed?
 *
 * `publishedAt` moves on every render pass, so comparing whole snapshots would
 * rewrite the store and reload the widget several times a minute for nothing.
 */
export const sameWidgetContent = (a: WidgetSnapshot, b: WidgetSnapshot): boolean =>
  JSON.stringify({ hero: a.hero, upNext: a.upNext, moreCount: a.moreCount }) ===
  JSON.stringify({ hero: b.hero, upNext: b.upNext, moreCount: b.moreCount })
