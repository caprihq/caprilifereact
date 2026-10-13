import InAppBrowser from 'react-native-inappbrowser-reborn'

import { base44 } from '@/services/api'
import {
  WATCH_INTERVAL_MS,
  WATCH_LIMIT_MS,
  closeWhenConnected,
  isConnectedReply,
} from './calendarConnection'

jest.mock('@/services/api', () => ({
  base44: { functions: { invoke: jest.fn() }, connectors: {} },
}))

const { invoke } = base44.functions as unknown as { invoke: jest.Mock }
const { close } = jest.mocked(InAppBrowser) as unknown as { close: jest.Mock }

const LINKED = { data: { events: [] } }
const UNLINKED = { data: { events: null, connected: false } }
const REFUSED = { data: { error: 'Request had insufficient authentication scopes.' } }

/** Let pending promise callbacks run between timer ticks. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('isConnectedReply', () => {
  it('is connected only when a list of events came back', () => {
    expect(isConnectedReply({ events: [] })).toBe(true)
    expect(isConnectedReply({ events: [{ id: 'e1' }] })).toBe(true)
  })

  it('treats an error reply as not connected — the bug this guards against', () => {
    // A box left unticked on Google's consent screen comes back as an error, and
    // the old check read anything but an explicit "not connected" as success.
    expect(isConnectedReply(REFUSED.data)).toBe(false)
  })

  it('treats the explicit not-connected reply and junk as not connected', () => {
    expect(isConnectedReply(UNLINKED.data)).toBe(false)
    expect(isConnectedReply(undefined)).toBe(false)
    expect(isConnectedReply(null)).toBe(false)
    expect(isConnectedReply({})).toBe(false)
  })
})

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

  it('never closes on a refused token', async () => {
    invoke.mockResolvedValueOnce(UNLINKED).mockResolvedValue(REFUSED)
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
