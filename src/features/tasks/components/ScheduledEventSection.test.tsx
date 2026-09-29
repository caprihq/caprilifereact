import { fireEvent, render, screen } from '@testing-library/react-native'
import type * as ReactNamespace from 'react'
import type * as ReactNativeNamespace from 'react-native'

import { ScheduledEventSection } from './ScheduledEventSection'

/**
 * The picker is a native view with nothing to assert; what matters is that turning
 * the switch on produces a start time and shows the rows for changing it.
 *
 * Queries are async: the panel flushes on a later tick in this renderer, so a
 * synchronous `getBy*` straight after a press reads the tree from before it.
 */
jest.mock('@react-native-community/datetimepicker', () => {
  const RN = jest.requireActual<typeof ReactNativeNamespace>('react-native')
  const React = jest.requireActual<typeof ReactNamespace>('react')
  return { __esModule: true, default: () => React.createElement(RN.View) }
})

describe('ScheduledEventSection', () => {
  it('gives an event a start time the moment it becomes one', async () => {
    // The serious bug: an event saved without a start time has no anchor, so it is
    // dropped from Today's Commitments, from Today's Plan, and from the ranking it
    // was just excluded from — it existed and appeared nowhere.
    const onChange = jest.fn()
    await render(
      <ScheduledEventSection draft={{ title: 'Dentist' }} onChange={onChange} />,
    )

    await fireEvent(screen.getByLabelText('Scheduled event'), 'valueChange', true)

    const next = onChange.mock.calls[0]?.[0] as { scheduled_start_time?: string }
    expect(next.scheduled_start_time).toBeDefined()
    expect(Number.isNaN(Date.parse(next.scheduled_start_time ?? ''))).toBe(false)
  })

  it('offers the event time once it is an event', async () => {
    await render(
      <ScheduledEventSection
        draft={{ title: 'Dentist', is_scheduled_event: true, scheduled_start_time: '2026-09-17T14:30:00.000Z' }}
        onChange={jest.fn()}
      />,
    )

    // One row, not two: the day comes from the Due date field above, exactly as
    // the web client composes it.
    expect(await screen.findByLabelText('Event time')).toBeTruthy()
    expect(screen.queryByLabelText('Starts')).toBeNull()
  })

  it('keeps a start time the user already chose', async () => {
    // Re-opening an event must not silently move it to the next half hour.
    const onChange = jest.fn()
    await render(
      <ScheduledEventSection
        draft={{ title: 'Dentist', scheduled_start_time: '2026-09-17T14:30:00.000Z' }}
        onChange={onChange}
      />,
    )

    await fireEvent(screen.getByLabelText('Scheduled event'), 'valueChange', true)

    const next = onChange.mock.calls[0]?.[0] as { scheduled_start_time?: string }
    expect(next.scheduled_start_time).toBe('2026-09-17T14:30:00.000Z')
  })
})
