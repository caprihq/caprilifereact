/**
 * React Query key factory.
 *
 * Centralised so an invalidation can never miss a cache through a typo'd inline
 * array — the web client repeated `["tasks", email]` by hand in a dozen places.
 *
 * Lives in `services/api` rather than inside a feature because the keys are
 * shared: tasks, commitments and the calendar all appear here, and both the
 * tasks and commitments features invalidate each other's caches. Keeping this
 * under `features/tasks` is what created the `commitments ⇄ tasks` dependency
 * cycle.
 */

export const queryKeys = {
  /** Every task cache, for a blanket invalidation. */
  tasksAll: ['tasks'] as const,
  tasks: (userEmail: string | null) => ['tasks', userEmail] as const,
  commitments: (userEmail: string | null) => ['commitments', userEmail] as const,
  calendarEvents: () => ['calendarEvents'] as const,
  currentUser: ['user', 'me'] as const,
} as const
