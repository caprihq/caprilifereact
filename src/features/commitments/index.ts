/** Public surface of the commitments feature. */
export { TodayCommitmentsSection } from './components/TodayCommitmentsSection'
export { CalendarIntegrationsSection } from './components/CalendarIntegrationsSection'
/** Read hooks, for the AI context builder in the tasks feature. */
export { useCalendarEvents, useCommitments } from './services/commitmentQueries'
/** Today's fixed items, for the planner's unified day. */
export { useTodayTimeline } from './hooks/useTodayTimeline'
export type { TimelineItem } from './logic/timeline'
