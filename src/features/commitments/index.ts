/** Public surface of the commitments feature. */
export { CalendarIntegrationsSection } from './components/CalendarIntegrationsSection'
/** Read hooks, for the AI context builder in the tasks feature. */
export { useCalendarEvents, useCommitments } from './services/commitmentQueries'
/** Today's fixed items, for the planner's unified day. */
export { useTodayTimeline } from './hooks/useTodayTimeline'
/** Removing a commitment from Home's Today's Plan. */
export { useCommitmentMutations } from './services/useCommitmentMutations'
export type { TimelineItem } from './logic/timeline'
