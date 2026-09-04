/**
 * What to say when someone hits a paid gate.
 *
 * Ported from the web client's `FEATURE_INFO`, and the point is the *specificity*:
 * a user who just tapped "generate subtasks" is told about subtasks, not shown a
 * generic feature list. Sending everyone to the same plan screen means nobody
 * learns what they were reaching for.
 *
 * Where a free allowance exists, the copy names it — "1 per day", "3 refreshes" —
 * because a limit you can see is a limit you can plan around, and it makes the
 * upgrade a concrete trade rather than a vague more.
 */

export type GatedFeature =
  | 'voice_limit'
  | 'task_limit'
  | 'whats_next'
  | 'auto_schedule'
  | 'subtasks'
  | 'recurring_tasks'
  | 'reprioritise'

export type UpgradeCopy = {
  readonly icon: string
  readonly title: string
  readonly description: string
}

const COPY: Readonly<Record<GatedFeature, UpgradeCopy>> = {
  voice_limit: {
    icon: 'mic-outline',
    title: "You've used your voice capture for today",
    description: 'Executive gives you unlimited voice capture. Free includes one a day.',
  },
  task_limit: {
    icon: 'list-outline',
    title: "You've reached the free task limit",
    description: 'Executive removes the cap so you can keep everything in one place.',
  },
  whats_next: {
    icon: 'flash-outline',
    title: 'Unlock AI recommendations',
    description: 'Free includes three Up Next refreshes a day. Executive makes them unlimited.',
  },
  auto_schedule: {
    icon: 'sparkles-outline',
    title: 'Unlock Smart Auto-Scheduling',
    description: 'Let CAPRI lay out your day around what actually matters first.',
  },
  subtasks: {
    icon: 'git-branch-outline',
    title: 'Let CAPRI break down your tasks',
    description: 'Turn any task into clear, actionable steps with one tap.',
  },
  recurring_tasks: {
    icon: 'repeat-outline',
    title: 'Unlock repeating tasks',
    description: 'Set something once and CAPRI brings it back when it is due again.',
  },
  reprioritise: {
    icon: 'trending-up-outline',
    title: 'Let CAPRI re-judge this task',
    description: 'Executive re-scores a task against everything else on your plate.',
  },
}

export const upgradeCopy = (feature: GatedFeature | null): UpgradeCopy =>
  feature
    ? COPY[feature]
    : {
        icon: 'star-outline',
        title: 'An Executive feature',
        description: 'Upgrade to unlock CAPRI’s planning and AI features.',
      }
