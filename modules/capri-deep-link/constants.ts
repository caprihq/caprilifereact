/**
 * The one URL shape a task has, in one place.
 *
 * Three surfaces open a task — a tapped reminder, a tapped widget, and a link
 * someone shares — and they must all mean the same thing. Duplicating the path in
 * Swift and TypeScript is unavoidable (a widget extension cannot import either), so
 * `configConstants.test.ts` fails if the copies drift.
 *
 * Import-free on purpose: `app.config.ts` reads this at build time in Node.
 */

/** `capri://task/<id>` and `https://capriforlifev1.base44.app/task/<id>`. */
export const TASK_LINK_PATH = 'task'

export const taskPathFor = (taskId: string): string => `${TASK_LINK_PATH}/${taskId}`

/**
 * `capri://home` — where a tap on the widget itself goes.
 *
 * It needs a real path. The scheme on its own (`capri://`) matches no route, and
 * React Navigation's answer to an unmatched link is to leave the app exactly where
 * it was — so tapping the widget reopened whatever screen was last on screen,
 * Profile included. A link that names Home is what actually switches to Home.
 */
export const HOME_LINK_PATH = 'home'

/**
 * The route path a link should resolve to.
 *
 * The bare scheme — `capri://` with nothing after it — is "open CAPRI", and the
 * only sensible reading of that is Home. Left to React Navigation's default, an
 * empty path matches no route and the app simply stays on whatever screen it last
 * showed. That is how a tap on the widget came to reopen Profile: an older widget
 * build sent exactly this URL. Mapping it here means no stale widget, shared link
 * or future caller can strand someone that way again.
 */
export const normalizeLinkPath = (path: string): string => {
  const bare = path.replace(/^\/+/, '').split('?')[0]?.split('#')[0] ?? ''
  return bare === '' ? HOME_LINK_PATH : path
}
