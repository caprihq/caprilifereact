import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { usePlan } from '@/hooks/usePlan'
import { base44 } from '@/services/api'
import { logWarn } from '@/utils'
import {
  buildWidgetSnapshot,
  lockedWidgetSnapshot,
  sameWidgetContent,
  widgetOrderOf,
} from '../logic/widgetSnapshot'
import type { WidgetSnapshot } from '../logic/widgetSnapshot'
import { openTaskFingerprint } from '../logic/widgetFingerprint'
import {
  clearLegacyWidgetToken,
  publishWidgetSnapshot,
  reloadWidgets,
} from '../services/widgetPublisher'
import type { Task } from '@/types/entities'

/**
 * Keep the home-screen widget showing what Home shows.
 *
 * Mounted on Home, because Home is where "Start Here" is decided and is the first
 * screen of every launch. Publishing from the feed hook instead would fire once per
 * consumer — several times per screen — for one shared result.
 *
 * Writes only when the visible content changes. The feed recomputes on every clock
 * tick, so publishing unconditionally would rewrite shared storage and reload the
 * widget a few times a minute, which costs battery and gains nothing.
 *
 * Two more rules keep the widget and Home from drifting apart — see
 * `widgetFingerprint.ts` for the whole story:
 *
 * - **The app tells the server which set of tasks it has already published.** The
 *   reminder sweep then pushes a snapshot only for changes the app has not seen,
 *   instead of overwriting Home's order with its own every few minutes.
 * - **Coming back to the foreground republishes.** Anything the server pushed while
 *   the app was closed is replaced by Home's own view the moment Home is visible.
 * - **The app tells the server the order it published**, so a push for a change made
 *   elsewhere keeps Home's order instead of ranking by priority — see `widgetOrderOf`.
 *
 * The widget is an Executive feature: a free account's gets a note saying so.
 */

/**
 * Records the published order once per change. Its own write, apart from the
 * fingerprint's, so a failure here can never stop the fingerprint being recorded.
 * Best effort: the next change records it again.
 *
 * `forget` on a return to the foreground: a push while the app was away stored the
 * server's order, so Home's must be written again even if it has not changed.
 */
const useOrderRecorder = () => {
  const recorded = useRef<string | null>(null)
  const record = useCallback((order: string) => {
    if (recorded.current === order) return
    recorded.current = order
    base44.auth.updateMe({ widget_order: order }).catch((error: unknown) => {
      recorded.current = null
      logWarn('[widget] could not record the published order', error)
    })
  }, [])
  const forget = useCallback(() => {
    recorded.current = null
  }, [])
  return { record, forget }
}
export const useWidgetSnapshot = (input: {
  readonly hero: Task | null
  readonly upNext: readonly Task[]
  readonly nowMs: number
  /** Every task eligible for the ranking, so the widget can count what it omits. */
  readonly totalOpen: number
  /** The whole list, for the fingerprint the server compares against. */
  readonly allTasks: readonly Task[]
  /** Nothing is published until the feed has actually loaded. */
  readonly ready: boolean
}) => {
  const { hero, upNext, nowMs, totalOpen, allTasks, ready } = input
  const published = useRef<{ snapshot: WidgetSnapshot; fingerprint: string } | null>(null)
  const recorded = useRef<string | null>(null)
  const { record: recordOrder, forget: forgetOrder } = useOrderRecorder()
  const { hasAccess } = usePlan()
  const locked = !hasAccess('widget')
  // Bumped on every return to the foreground, purely to re-run the publish effect.
  const [foregrounds, setForegrounds] = useState(0)

  // Once per launch: a phone upgraded from the Capacitor app still holds that app's
  // session token in shared storage, in plaintext, read by nothing.
  useEffect(() => {
    void clearLegacyWidgetToken()
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      // Forget what we published: the store may hold a server push from while we
      // were away, and only an unconditional write puts Home's view back.
      published.current = null
      forgetOrder()
      setForegrounds((n) => n + 1)
    })
    return () => subscription.remove()
  }, [forgetOrder])

  const fingerprint = openTaskFingerprint(allTasks)

  useEffect(() => {
    if (!ready) return

    const snapshot = locked
      ? lockedWidgetSnapshot(nowMs)
      : buildWidgetSnapshot({ hero, upNext, nowMs, totalOpen })
    const last = published.current
    if (last && last.fingerprint === fingerprint && sameWidgetContent(last.snapshot, snapshot)) {
      return
    }

    published.current = { snapshot, fingerprint }
    void publishWidgetSnapshot(snapshot).then(reloadWidgets)

    // A free account's widget is never pushed to, so there is nothing to record.
    if (locked) return
    recordOrder(widgetOrderOf(snapshot))
    if (recorded.current === fingerprint) return
    recorded.current = fingerprint
    // Best effort. If this fails the sweep may push its own order once, and the next
    // foreground puts Home's back — the widget is never left wrong for long.
    base44.auth.updateMe({ widget_snapshot_hash: fingerprint }).catch((error: unknown) => {
      recorded.current = null
      logWarn('[widget] could not record the published fingerprint', error)
    })
  }, [hero, upNext, nowMs, totalOpen, fingerprint, ready, foregrounds, locked, recordOrder])
}
