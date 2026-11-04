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
 *   the opaque Base44 user id, the same one Crashlytics gets. Every parameter below is
 *   a number or a closed union for that reason: a free-text field cannot be added
 *   without changing this file.
 *
 * Every event here is fired somewhere. One that is listed but never sent reads as
 * "nobody does this" in the reports, which is worse than not listing it. The plain
 * English version, for whoever reads the reports, is `Analytics-Events.md`.
 *
 * Pure: no Firebase import, so the catalogue can be read and tested without it.
 */

/** Firebase rejects names over 40 characters and anything not snake_case. */
export type AnalyticsEvent =
  /** The hero was acted on — the product's central promise, used or ignored. */
  | { readonly name: 'start_here_completed'; readonly params: { readonly source: TaskSource } }
  | { readonly name: 'start_here_skipped'; readonly params: { readonly source: TaskSource } }
  /** A new ranking: from the model or the local scorer, asked for or automatic. */
  | {
      readonly name: 'up_next_refreshed'
      readonly params: { readonly source: Engine; readonly trigger: RankTrigger }
    }
  | {
      readonly name: 'task_created'
      readonly params: { readonly input: CaptureInput; readonly parser: Engine }
    }
  /** Every completion, whichever screen it came from. The hero's is also counted above. */
  | { readonly name: 'task_completed'; readonly params: { readonly source: TaskSource } }
  /** Activation: once per new account, so "unique users" is the number of new accounts. */
  | { readonly name: 'first_task_created'; readonly params: Activation }
  | { readonly name: 'first_up_next_success'; readonly params: Activation }
  /** CAPRI split a task into steps. */
  | { readonly name: 'task_breakdown'; readonly params: { readonly steps: number } }
  /** Auto-schedule is the most expensive feature to run; acceptance is its worth. */
  | { readonly name: 'auto_schedule_run'; readonly params: { readonly suggested: number } }
  | { readonly name: 'auto_schedule_accepted'; readonly params: { readonly accepted: number } }
  /** Where a free user meets the wall, and whether the wall sells anything. */
  | { readonly name: 'upgrade_prompted'; readonly params: { readonly feature: string } }
  | { readonly name: 'upgrade_purchased'; readonly params: { readonly product: string } }
  /** Does the widget bring people back? The reason deep links carry a source. */
  | { readonly name: 'app_opened_from'; readonly params: { readonly source: OpenSource } }
  | {
      readonly name: 'onboarding_finished'
      readonly params: { readonly outcome: 'completed' | 'skipped' }
    }

export type TaskSource = 'home' | 'all_tasks' | 'planner' | 'task_detail'
/** Which engine answered: the model, or the local fallback. */
export type Engine = 'ai' | 'local'
export type RankTrigger = 'auto' | 'manual'
export type CaptureInput = 'typed' | 'voice'
export type OpenSource = 'widget' | 'notification' | 'link'
/** Days from sign-up to the moment, so time-to-activation can be read too. */
export type Activation = { readonly days_since_signup: number }

/**
 * Screens worth naming.
 *
 * A screen view is the cheapest signal there is and the easiest to drown in, so the
 * list is the screens a question might be asked about rather than every route.
 *
 * Firebase's own automatic screen reporting is off (Info.plist), because it reports
 * the native container class — "RNSScreen" — for every screen alike. This list is the
 * only source of screen names. The two sign-in screens are here so the path from
 * first open to an account can be read before anyone has logged in.
 */
export const TRACKED_SCREENS = [
  'Login',
  'EmailSignUp',
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
