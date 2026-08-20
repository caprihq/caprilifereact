import { act, renderHook } from '@testing-library/react-native'

import { useFeedbackStore } from '@/store/feedbackStore'
import { requestPasswordReset } from '../services/passwordService'
import { usePasswordReset } from './usePasswordReset'

/**
 * The reported bug was "the Forgot button never runs": the request was firing,
 * but the screen reused the sign-in busy flag, so nothing on screen changed for
 * the 4–21s a Base44 round trip can take. These tests pin the state that makes
 * the tap visible — the part a refactor could quietly drop again.
 *
 * `renderHook` is awaited: in RTL v14 it is async, and it fills `result.current`
 * from an effect, so every read has to follow a settled `act`.
 *
 * The feedback store is real rather than mocked, so a test failure means the
 * user genuinely would not see a toast.
 */

jest.mock('../services/passwordService', () => ({
  requestPasswordReset: jest.fn(),
}))

const mockRequest = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>

/** A request that stays in flight until the test releases it. */
const deferred = () => {
  let release: () => void = () => undefined
  const promise = new Promise<{ readonly kind: 'ok' }>((resolve) => {
    release = () => {
      resolve({ kind: 'ok' })
    }
  })
  return { promise, release }
}

/**
 * Start a request and commit the synchronous `setBusy(true)` without awaiting
 * the request — that in-flight window is what the test is about.
 *
 * The act callback is deliberately synchronous. An `async` one that holds a
 * promise which has not settled yet never resolves, and the test just times out.
 *
 * The in-flight promise comes back **wrapped**: `return pending` from an async
 * function awaits it, so the helper could not resolve until the request settled —
 * which is exactly what the caller has yet to release. That deadlocks.
 */
const startRequest = async (call: () => Promise<void>): Promise<{ pending: Promise<void> }> => {
  let pending: Promise<void> = Promise.resolve()
  await act(() => {
    pending = call()
  })
  return { pending }
}

beforeEach(() => {
  mockRequest.mockReset()
  useFeedbackStore.getState().dismiss()
})

describe('usePasswordReset', () => {
  it('reports busy while the request is in flight, so the button can spin', async () => {
    const { promise, release } = deferred()
    mockRequest.mockReturnValue(promise)

    const { result } = await renderHook(() => usePasswordReset())
    expect(result.current.busy).toBe(false)

    const { pending } = await startRequest(() => result.current.request('someone@example.com'))
    expect(result.current.busy).toBe(true)

    await act(async () => {
      release()
      await pending
    })
    expect(result.current.busy).toBe(false)
  })

  it('ignores a second tap while the first is still running', async () => {
    const { promise, release } = deferred()
    mockRequest.mockReturnValue(promise)

    const { result } = await renderHook(() => usePasswordReset())
    const { pending } = await startRequest(() => result.current.request('someone@example.com'))
    expect(result.current.busy).toBe(true)

    // An impatient user taps again — Base44 answers 429 if this reaches it.
    await startRequest(() => result.current.request('someone@example.com'))
    expect(mockRequest).toHaveBeenCalledTimes(1)

    await act(async () => {
      release()
      await pending
    })
    expect(mockRequest).toHaveBeenCalledTimes(1)
  })

  it('confirms through the toast, not only an inline line', async () => {
    mockRequest.mockResolvedValue({ kind: 'ok' })

    const { result } = await renderHook(() => usePasswordReset())
    await act(async () => {
      await result.current.request('  someone@example.com  ')
    })

    // Trimmed, and deliberately non-committal about whether the account exists.
    expect(useFeedbackStore.getState().current?.message).toBe(
      'If someone@example.com has an account, a reset link is on its way.',
    )
    expect(result.current.error).toBeNull()
  })

  it('asks for an email instead of calling Base44 with an empty one', async () => {
    const { result } = await renderHook(() => usePasswordReset())
    await act(async () => {
      await result.current.request('   ')
    })

    expect(mockRequest).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Enter your email address first, then tap Forgot password.')
    expect(useFeedbackStore.getState().current).toBeNull()
  })

  it('surfaces a transport failure inline and shows no success toast', async () => {
    mockRequest.mockResolvedValue({ kind: 'error', message: 'Could not send a reset email.' })

    const { result } = await renderHook(() => usePasswordReset())
    await act(async () => {
      await result.current.request('someone@example.com')
    })

    expect(result.current.error).toBe('Could not send a reset email.')
    expect(useFeedbackStore.getState().current).toBeNull()

    await act(() => {
      result.current.clear()
    })
    expect(result.current.error).toBeNull()
  })
})
