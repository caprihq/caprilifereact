import { useEffect, useRef } from 'react'

import { buildWidgetSnapshot, sameWidgetContent } from '../logic/widgetSnapshot'
import type { WidgetSnapshot } from '../logic/widgetSnapshot'
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
 */
export const useWidgetSnapshot = (input: {
  readonly hero: Task | null
  readonly upNext: readonly Task[]
  readonly nowMs: number
  /** Every task eligible for the ranking, so the widget can count what it omits. */
  readonly totalOpen: number
  /** Nothing is published until the feed has actually loaded. */
  readonly ready: boolean
}) => {
  const { hero, upNext, nowMs, totalOpen, ready } = input
  const published = useRef<WidgetSnapshot | null>(null)

  // Once per launch: a phone upgraded from the Capacitor app still holds that app's
  // session token in shared storage, in plaintext, read by nothing.
  useEffect(() => {
    void clearLegacyWidgetToken()
  }, [])

  useEffect(() => {
    if (!ready) return

    const snapshot = buildWidgetSnapshot({ hero, upNext, nowMs, totalOpen })
    if (published.current && sameWidgetContent(published.current, snapshot)) return

    published.current = snapshot
    void publishWidgetSnapshot(snapshot).then(reloadWidgets)
  }, [hero, upNext, nowMs, totalOpen, ready])
}
