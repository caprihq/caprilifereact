import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44 } from '@/services/api'
import {
  WATCH_INTERVAL_MS,
  WATCH_LIMIT_MS,
  closeWhenConnected,
  reconnectCalendar,
} from './calendarConnection'

jest.mock('@/services/api', () => ({
  base44: {
    functions: { invoke: jest.fn() },
    connectors: { connectAppUser: jest.fn(), disconnectAppUser: jest.fn() },
  },
}))

const { invoke } = base44.functions as unknown as { invoke: jest.Mock }
const { close } = jest.mocked(InAppBrowser) as unknown as { close: jest.Mock }

const LINKED = { data: { events: [] } }
const UNLINKED = { data: { events: null, connected: false } }
const NO_SCOPE = { data: { error: 'insufficient scopes', problem: 'missing_permission' } }
const GOOGLE_DOWN = { data: { error: 'backend error', problem: 'calendar_error' } }

/** Let pending promise callbacks run between timer ticks. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('closeWhenConnected', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    invoke.mockReset()
    close.mockReset()
  })
  afterEach(() => jest.useRealTimers())

  it('closes the sheet once the link appears after the user signs in', async () => {
    invoke.mockResolvedValueOnce(UNLINKED).mockResolvedValueOnce(UNLINKED).mockResolvedValue(LINKED)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS)
    await flush()
    expect(close).not.toHaveBeenCalled()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS)
    await flush()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('never closes when already linked — someone reconnecting must be able to sign in', async () => {
    invoke.mockResolvedValue(LINKED)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 4)
    await flush()
    expect(close).not.toHaveBeenCalled()
  })

  it('closes when sign-in finishes but calendar access was not granted', async () => {
    // The sheet has nothing more to offer; the message that follows says what to tick.
    invoke.mockResolvedValueOnce(UNLINKED).mockResolvedValue(NO_SCOPE)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS)
    await flush()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('closes when a missing-permission user signs in again properly', async () => {
    // Jennifer's case after the scope fix: she starts linked-without-calendar.
    invoke.mockResolvedValueOnce(NO_SCOPE).mockResolvedValue(LINKED)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS)
    await flush()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('stays open if the same narrow grant comes back again', async () => {
    invoke.mockResolvedValue(NO_SCOPE)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 4)
    await flush()
    expect(close).not.toHaveBeenCalled()
  })

  it('never closes on a failed request mid-sign-in', async () => {
    invoke.mockResolvedValueOnce(UNLINKED).mockResolvedValue(GOOGLE_DOWN)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 4)
    await flush()
    expect(close).not.toHaveBeenCalled()
  })

  it('stops checking once stopped, and a late answer does nothing', async () => {
    let answer: (v: unknown) => void = () => undefined
    invoke.mockResolvedValueOnce(UNLINKED).mockReturnValueOnce(new Promise((r) => (answer = r)))
    const stop = closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS)
    stop()
    answer(LINKED)
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 4)
    await flush()
    expect(close).not.toHaveBeenCalled()
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('does not stack checks while one is still waiting', async () => {
    invoke.mockResolvedValueOnce(UNLINKED).mockReturnValue(new Promise(() => undefined))
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 5)
    await flush()
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('gives up after the time limit', async () => {
    invoke.mockResolvedValue(UNLINKED)
    closeWhenConnected()
    await flush()
    jest.advanceTimersByTime(WATCH_LIMIT_MS + WATCH_INTERVAL_MS * 2)
    await flush()
    const calls = invoke.mock.calls.length
    jest.advanceTimersByTime(WATCH_INTERVAL_MS * 10)
    await flush()
    expect(invoke.mock.calls.length).toBe(calls)
  })
})

describe('reconnectCalendar', () => {
  const { connectAppUser, disconnectAppUser } = base44.connectors as unknown as {
    connectAppUser: jest.Mock
    disconnectAppUser: jest.Mock
  }

  beforeEach(() => {
    connectAppUser.mockReset().mockResolvedValue('')
    disconnectAppUser.mockReset().mockResolvedValue(undefined)
  })

  it('drops the old grant before signing in again', async () => {
    // A grant keeps its old scopes until it is removed — reconnecting on top of an
    // email-only grant left it email-only.
    const order: string[] = []
    disconnectAppUser.mockImplementation(() => {
      order.push('disconnect')
      return Promise.resolve()
    })
    connectAppUser.mockImplementation(() => {
      order.push('connect')
      return Promise.resolve('')
    })
    await reconnectCalendar()
    expect(order).toEqual(['disconnect', 'connect'])
  })

  it('still signs in when there was nothing to drop', async () => {
    disconnectAppUser.mockRejectedValue(new Error('No connection'))
    await reconnectCalendar()
    expect(connectAppUser).toHaveBeenCalledTimes(1)
  })
})
