import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type * as ReactNamespace from 'react'
import type * as ReactNativeNamespace from 'react-native'

import { DueDateRow } from './DueDateRow'

/**
 * The picker itself is a native view with no behaviour to test; what matters is the
 * panel around it, which is where both faults were.
 *
 * `emit` captures the picker's `onChange` so a test can report a selection the way
 * the real one does — and, for the case that was broken, deliberately not report one.
 *
 * Queries are the async `findBy*` throughout: opening the panel flushes on a later
 * tick in this renderer, so a synchronous `getBy*` straight after a press looks at
 * the tree from before it.
 */
let emit: ((event: { type: string }, date?: Date) => void) | null = null

jest.mock('@react-native-community/datetimepicker', () => {
  const RN = jest.requireActual<typeof ReactNativeNamespace>('react-native')
  const React = jest.requireActual<typeof ReactNamespace>('react')
  return {
    __esModule: true,
    default: (props: { onChange: (e: { type: string }, d?: Date) => void }) => {
      emit = props.onChange
      return React.createElement(RN.View, { testID: 'picker' })
    },
  }
})

const XMAS = new Date('2026-12-25T00:00:00Z')

const dayOf = (mock: jest.Mock): string =>
  new Date(mock.mock.calls[0]?.[0] as string).toDateString()

describe('DueDateRow', () => {
  it('offers a way to confirm and a way to leave, and sets today with no change reported', async () => {
    // The reported bug. An unset due date opens the calendar on today, and tapping
    // today is not a *change*, so the picker stays silent — which left the user
    // picking another day and coming back. Confirm commits what is shown regardless.
    const onChange = jest.fn()
    await render(<DueDateRow value={undefined} onChange={onChange} />)
    await fireEvent.press(screen.getByLabelText('Due date'))

    expect(await screen.findByTestId('picker')).toBeTruthy()
    expect(await screen.findByLabelText('Close due date')).toBeTruthy()

    await fireEvent.press(await screen.findByLabelText('Confirm due date'))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
    })
    expect(dayOf(onChange)).toBe(new Date().toDateString())
  })

  it('commits the date chosen in the calendar', async () => {
    const onChange = jest.fn()
    await render(<DueDateRow value={undefined} onChange={onChange} />)
    await fireEvent.press(screen.getByLabelText('Due date'))
    await screen.findByTestId('picker')

    emit?.({ type: 'set' }, XMAS)
    await fireEvent.press(await screen.findByLabelText('Confirm due date'))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
    })
    expect(dayOf(onChange)).toBe(XMAS.toDateString())
  })

  it('changes nothing when the calendar is closed', async () => {
    // Opened by mistake: leaving must not set a due date the user never wanted, and
    // it must put the calendar away.
    const onChange = jest.fn()
    await render(<DueDateRow value={undefined} onChange={onChange} />)
    await fireEvent.press(screen.getByLabelText('Due date'))
    await screen.findByTestId('picker')

    emit?.({ type: 'set' }, XMAS)
    await fireEvent.press(await screen.findByLabelText('Close due date'))

    await waitFor(() => {
      expect(screen.queryByTestId('picker')).toBeNull()
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})
