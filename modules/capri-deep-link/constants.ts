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
