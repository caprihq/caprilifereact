import { base44Config } from '@/config'
import { HOME_LINK_PATH, TASK_LINK_PATH } from '../../../modules/capri-deep-link/constants'
import type { OpenSource } from './events'

/**
 * Where an incoming link came from, for `app_opened_from`.
 *
 * Read from how the link arrived rather than from a tag inside it, so the widget and
 * the push payload keep the URLs they already send:
 *
 *  - **parked** links are reminder taps. The app delegate parks them for JavaScript
 *    to collect (`CapriDeepLink`), and nothing else parks a link.
 *  - **`capri://home` and `capri://task/…`** arriving as an ordinary URL open come from
 *    the home-screen widget. Shared links are https, and the sign-in return
 *    (`capri://auth`) is neither path, so it is not counted.
 *  - **https** links are shared or emailed links.
 *
 * Pure, so the rules are tested without a device.
 */

export type LinkArrival = 'parked' | 'opened'

const scheme = `${base44Config.authCallbackScheme}://`
const WIDGET_PREFIXES = [`${scheme}${HOME_LINK_PATH}`, `${scheme}${TASK_LINK_PATH}/`]

export const openSourceOf = (url: string, arrival: LinkArrival): OpenSource | null => {
  if (arrival === 'parked') return 'notification'
  const lower = url.toLowerCase()
  if (WIDGET_PREFIXES.some((prefix) => lower.startsWith(prefix))) return 'widget'
  if (lower.startsWith('https://')) return 'link'
  return null
}
