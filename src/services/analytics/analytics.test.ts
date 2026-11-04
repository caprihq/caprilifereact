import {
  logEvent,
  setAnalyticsCollectionEnabled,
  setUserId,
  setUserProperties,
} from '@react-native-firebase/analytics'

import type { User } from '@/types/entities'
import { initAnalytics, setAnalyticsUser, trackRanking, trackTaskCreated } from './analytics'

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  logScreenView: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(() => Promise.resolve()),
  setUserProperties: jest.fn(() => Promise.resolve()),
}))

/** The event names sent, in order. */
const sent = (): readonly unknown[] => jest.mocked(logEvent).mock.calls.map((call) => call[1])

/** Each test signs in its own account: the "already sent" flags outlive a test. */
const account = (id: string, createdDate: string = new Date().toISOString()): User => ({
  id,
  email: `${id}@gmail.com`,
  created_date: createdDate,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('initAnalytics', () => {
  it('keeps collection off in a development build', async () => {
    await initAnalytics()
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith({}, false)
  })
})

describe('setAnalyticsUser', () => {
  it('sends the opaque id and the plan, never the email', () => {
    setAnalyticsUser({ ...account('u-plan'), plan: 'executive' })
    expect(setUserId).toHaveBeenCalledWith({}, 'u-plan')
    expect(setUserProperties).toHaveBeenCalledWith({}, { plan: 'executive' })
  })

  it('clears the id on sign-out and sets no properties', () => {
    setAnalyticsUser(null)
    expect(setUserId).toHaveBeenCalledWith({}, null)
    expect(setUserProperties).not.toHaveBeenCalled()
  })
})

describe('trackTaskCreated', () => {
  it("records a new account's first task once", () => {
    setAnalyticsUser(account('u-first'))
    trackTaskCreated({ input: 'voice', parser: 'ai', firstForAccount: true })
    trackTaskCreated({ input: 'typed', parser: 'local', firstForAccount: true })

    expect(sent()).toEqual(['task_created', 'first_task_created', 'task_created'])
    expect(logEvent).toHaveBeenCalledWith({}, 'first_task_created', { days_since_signup: 0 })
    expect(logEvent).toHaveBeenCalledWith({}, 'task_created', { input: 'voice', parser: 'ai' })
  })

  it('records no first task when the account already had tasks', () => {
    setAnalyticsUser(account('u-has-tasks'))
    trackTaskCreated({ input: 'typed', parser: 'local', firstForAccount: false })
    expect(sent()).toEqual(['task_created'])
  })

  it('records no first task for an account outside the activation window', () => {
    setAnalyticsUser(account('u-old', '2025-01-01T00:00:00.000000'))
    trackTaskCreated({ input: 'typed', parser: 'local', firstForAccount: true })
    expect(sent()).toEqual(['task_created'])
  })

  it('records no first task while signed out', () => {
    setAnalyticsUser(null)
    trackTaskCreated({ input: 'typed', parser: 'local', firstForAccount: true })
    expect(sent()).toEqual(['task_created'])
  })
})

describe('trackRanking', () => {
  it('counts a local fallback as a refresh, not a success', () => {
    setAnalyticsUser(account('u-local'))
    trackRanking({ fromModel: false, manual: false })

    expect(sent()).toEqual(['up_next_refreshed'])
    expect(logEvent).toHaveBeenCalledWith({}, 'up_next_refreshed', {
      source: 'local',
      trigger: 'auto',
    })
  })

  it("records a new account's first model answer once", () => {
    setAnalyticsUser(account('u-ai'))
    trackRanking({ fromModel: true, manual: true })
    trackRanking({ fromModel: true, manual: false })

    expect(sent()).toEqual(['up_next_refreshed', 'first_up_next_success', 'up_next_refreshed'])
  })
})
