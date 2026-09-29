import { DateTimeRow } from '@/components/DateTimeRow'
import { eventStartFrom, nextHalfHour } from '../logic/eventStart'

/**
 * "Event time" — the time of day a scheduled event starts.
 *
 * A time and nothing else, which is the web client's shape: `AddTaskSheet.jsx` shows
 * a bare `<input type="time">` under the toggle and composes the start instant from
 * the task's **due date** plus that time. The day is therefore the Due date row
 * already above this one, and asking for it twice would let the two disagree.
 */

type EventTimeRowProps = {
  /** The day the event falls on. Today when unset — see `eventStartFrom`. */
  readonly dueDate: string | undefined
  readonly value: string | undefined
  readonly onChange: (iso: string) => void
  /** Injected so the default is testable at a fixed instant (§2.3). */
  readonly nowMs: number
}

export const EventTimeRow = ({ dueDate, value, onChange, nowMs }: EventTimeRowProps) => {
  const parsed = value ? new Date(value) : null
  const current = parsed && !Number.isNaN(parsed.getTime()) ? parsed : nextHalfHour(nowMs)

  return (
    <DateTimeRow
      label="Event time"
      value={current}
      mode="time"
      onChange={(time) => {
        onChange(eventStartFrom({ dueDate, time, nowMs }))
      }}
    />
  )
}
