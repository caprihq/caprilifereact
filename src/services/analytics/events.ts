/**
 * Everything CAPRI records, as a closed set.
 *
 * WHY A CATALOGUE RATHER THAN STRINGS AT THE CALL SITE
 *   Analytics rots the moment anyone can invent an event name. Two spellings of the
 *   same idea become two funnels that each look half-used, a renamed event silently
 *   ends its own history, and nobody can tell which of forty names still means
 *   anything. A closed set makes a typo a compile error and keeps the list short
 *   enough to read in one sitting.
 *
 * WHAT IS HERE, AND WHY ONLY THIS
 *   Each event answers a question someone would actually act on. "Is the product's
 *   central promise used, and does it work?" is worth measuring; "user scrolled" is
 *   not. Fewer, better-chosen events beat exhaustive ones nobody reads.
 *
 * NEVER LOG
 *   Task titles, notes, email addresses, names, or anything a user typed. Counts,
 *   durations and enumerated choices only. The identity attached to all of this is
 *   the opaque Base44 user id, the same one Crashlytics gets.
 *
 * Pure: no Firebase import, so the catalogue can be read and tested without it.
 */

/** Firebase rejects names over 40 characters and anything not snake_case. */
export type AnalyticsEvent =
  /** The hero was acted on — the product's central promise, used or ignored. */
  | { readonly name: 'start_here_completed'; readonly params: { readonly source: TaskSource } }
  | { readonly name: 'start_here_skipped'; readonly params: { readonly source: TaskSource } }
  /** Did CAPRI's pick come from the model or the local scorer? */
  | { readonly name: 'up_next_refreshed'; readonly params: { readonly source: RankSource } }
  | { readonly name: 'task_created'; readonly params: { readonly method: CreateMethod } }
  | { readonly name: 'task_completed'; readonly params: { readonly source: TaskSource } }
  /** Auto-schedule is the most expensive feature to run; acceptance is its worth. */
  | { readonly name: 'auto_schedule_run'; readonly params: { readonly suggested: number } }
  | { readonly name: 'auto_schedule_accepted'; readonly params: { readonly accepted: number } }
  /** Where a free user meets the wall, and whether the wall sells anything. */
  | { readonly name: 'upgrade_prompted'; readonly params: { readonly feature: string } }
  | { readonly name: 'upgrade_purchased'; readonly params: { readonly product: string } }
  /** Does the widget bring people back? The reason deep links carry a source. */
  | { readonly name: 'app_opened_from'; readonly params: { readonly source: OpenSource } }
  | { readonly name: 'onboarding_finished'; readonly params: Record<string, never> }
  | { readonly name: 'offline_data_shown'; readonly params: Record<string, never> }

export type TaskSource = 'home' | 'all_tasks' | 'planner' | 'widget' | 'notification'
export type RankSource = 'ai' | 'local'
export type CreateMethod = 'typed' | 'voice' | 'ai_parsed'
export type OpenSource = 'widget' | 'notification' | 'link'

/**
 * Screens worth naming.
 *
 * A screen view is the cheapest signal there is and the easiest to drown in, so the
 * list is the screens a question might be asked about rather than every route.
 */
export const TRACKED_SCREENS = [
  'Home',
  'AllTasks',
  'Planner',
  'TaskDetail',
  'AddTask',
  'AutoSchedule',
  'Plan',
  'Profile',
] as const

export type TrackedScreen = (typeof TRACKED_SCREENS)[number]

export const isTrackedScreen = (name: string): name is TrackedScreen =>
  (TRACKED_SCREENS as readonly string[]).includes(name)
