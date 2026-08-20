import type { Task } from '@/types/entities'
import { getUrgency } from './capriScoring'
import type { BehaviouralSignals } from './capriScoring'
import { NO_SIGNALS } from './capriScoring'

/**
 * The short human line under a recommended task ("Do this now, feel better").
 *
 * Ported from web/src/lib/capriScoring.js. Variants are chosen deterministically
 * from the task id so the wording is stable across renders — a task must not
 * change its reason every time the list repaints.
 *
 * Pure: urgency and behavioural signals are arguments, not storage reads.
 */

/** Stable pick — same task id always yields the same variant. */
const pick = (options: readonly string[], taskId: string): string => {
  const seed = [...taskId].reduce((total, char) => total + char.charCodeAt(0), 0)
  return options[seed % options.length] ?? options[0] ?? ''
}

const OVERDUE_QUICK = [
  'Clear this off your plate',
  '5 min to feel lighter',
  "Quick — then it's done",
]
const OVERDUE_RECENT = [
  "You're so close — finish it",
  'Almost there, keep going',
  "One push and it's done",
]
const OVERDUE = [
  'Do this now, feel better',
  'Get this one behind you',
  "This one's been waiting",
  "A little overdue — let's go",
]

const TODAY_QUICK = ['Quick — do it now', 'Takes minutes, due today', 'Tiny task, big relief']
const TODAY_RECENT = [
  'Keep the momentum going',
  "You're in a rhythm — push",
  "Building on yesterday's work",
]
const TODAY = [
  "Today's the day for this",
  "Now's a good time for this",
  "Don't leave this for tonight",
  'Check this off before end of day',
]

const SOON_QUICK = ['Knock it out early', "Do it before it's urgent", 'Get ahead of this one']
const SOON_IMPORTANT = [
  "Don't let this sneak up",
  'Coming up — worth starting',
  'High stakes, close deadline',
]
const SOON = ['Good to get ahead of this', 'A little early is perfect', 'Coming up soon']

const RECENT = ['You were just in this', 'Good time to keep going', 'Fresh in your head — use it']
const IGNORED_QUICK = ['Just 5 minutes — go', 'Tiny effort, off your mind', 'You keep skipping this one']
const IGNORED = [
  'Future-you will thank you',
  "You've been putting this off",
  'This one keeps coming back',
]

const QUICK_WIN = [
  "Easy win while you're here",
  'Low lift, feels great after',
  'Quick one — worth it',
  'Fast task, real progress',
]
const HIGH_LONG = ['Worth the time investment', 'Big task, big payoff', 'This one matters — dig in']
const HIGH = [
  'This one moves the needle',
  'High impact when done',
  'A priority worth tackling',
  'Makes a real difference',
]
const MEDIUM = [
  'Good for future-you',
  'Steady progress wins',
  'One step further ahead',
  'Worth doing while calm',
]
const LOW = [
  'Nice to do when ready',
  'Low pressure, good to do',
  'Good to chip away at',
  'When you have a moment',
]

/** Everything the copy rules are allowed to look at. */
type ReasonFacts = {
  readonly urgency: number
  readonly isQuickWin: boolean
  readonly isLong: boolean
  readonly isHigh: boolean
  readonly isMedium: boolean
  readonly recent: boolean
  readonly ignored: boolean
}

/**
 * Ordered rules, most specific first — the same precedence the web version
 * expressed as nested ifs, but flat, so adding a case does not deepen the
 * branching.
 */
const REASON_RULES: ReadonlyArray<{
  readonly when: (f: ReasonFacts) => boolean
  readonly copy: readonly string[]
}> = [
  { when: (f) => f.urgency >= 5 && f.isQuickWin, copy: OVERDUE_QUICK },
  { when: (f) => f.urgency >= 5 && f.recent, copy: OVERDUE_RECENT },
  { when: (f) => f.urgency >= 5, copy: OVERDUE },

  { when: (f) => f.urgency === 4 && f.isQuickWin, copy: TODAY_QUICK },
  { when: (f) => f.urgency === 4 && f.recent, copy: TODAY_RECENT },
  { when: (f) => f.urgency === 4, copy: TODAY },

  { when: (f) => f.urgency === 3 && f.isQuickWin, copy: SOON_QUICK },
  { when: (f) => f.urgency === 3 && f.isHigh, copy: SOON_IMPORTANT },
  { when: (f) => f.urgency === 3, copy: SOON },

  { when: (f) => f.recent, copy: RECENT },
  { when: (f) => f.ignored && f.isQuickWin, copy: IGNORED_QUICK },
  { when: (f) => f.ignored, copy: IGNORED },
  { when: (f) => f.isQuickWin, copy: QUICK_WIN },
  { when: (f) => f.isHigh && f.isLong, copy: HIGH_LONG },
  { when: (f) => f.isHigh, copy: HIGH },
  { when: (f) => f.isMedium, copy: MEDIUM },
  { when: () => true, copy: LOW },
]

export const getTaskReason = (
  task: Task,
  nowMs: number,
  signals: BehaviouralSignals = NO_SIGNALS,
): string => {
  const minutes = task.estimated_minutes
  const facts: ReasonFacts = {
    urgency: getUrgency(task, nowMs),
    isQuickWin: !!minutes && minutes < 30,
    isLong: !!minutes && minutes > 60,
    isHigh: task.priority === 'critical' || task.priority === 'high',
    isMedium: task.priority === 'medium',
    recent: signals.recentlyTouched.has(task.id),
    ignored: signals.repeatedlyIgnored.has(task.id),
  }

  const rule = REASON_RULES.find((candidate) => candidate.when(facts))
  return pick(rule?.copy ?? LOW, task.id)
}
