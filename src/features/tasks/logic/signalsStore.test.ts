import {
  clearSignals,
  favouredCategories,
  loadSignals,
  pruneSignals,
  recordIgnored,
  recordInteraction,
} from './signalsStore'
import type { Task } from '@/types/entities'

const NOW = new Date('2026-08-11T12:00:00Z').getTime()
const HOUR = 60 * 60 * 1000

const task = (over: Partial<Task> = {}): Task => ({ id: 't', title: 'Task', ...over })

beforeEach(() => {
  clearSignals()
})

describe('interaction signals', () => {
  it('marks a task touched within the last 24h', () => {
    recordInteraction('t1', NOW - HOUR)
    expect(loadSignals(NOW).recentlyTouched.has('t1')).toBe(true)
  })

  it('expires an interaction older than 24h', () => {
    recordInteraction('t1', NOW - 30 * HOUR)
    expect(loadSignals(NOW).recentlyTouched.has('t1')).toBe(false)
  })

  it('starts empty', () => {
    expect(loadSignals(NOW).recentlyTouched.size).toBe(0)
  })
})

describe('ignore signals', () => {
  it('needs three skips before a task counts as ignored', () => {
    recordIgnored('t1')
    recordIgnored('t1')
    expect(loadSignals(NOW).repeatedlyIgnored.has('t1')).toBe(false)

    recordIgnored('t1')
    expect(loadSignals(NOW).repeatedlyIgnored.has('t1')).toBe(true)
  })

  it('counts each task separately', () => {
    recordIgnored('a')
    for (let i = 0; i < 3; i += 1) recordIgnored('b')

    const signals = loadSignals(NOW)
    expect(signals.repeatedlyIgnored.has('a')).toBe(false)
    expect(signals.repeatedlyIgnored.has('b')).toBe(true)
  })
})

describe('favouredCategories', () => {
  it('flags a category above 30% of completions', () => {
    const completed = [
      task({ category: 'work' }),
      task({ category: 'work' }),
      task({ category: 'health' }),
    ]
    expect(favouredCategories(completed).has('work')).toBe(true)
  })

  it('does not flag an evenly spread history', () => {
    const completed = [
      task({ category: 'work' }),
      task({ category: 'health' }),
      task({ category: 'social' }),
      task({ category: 'finance' }),
    ]
    expect(favouredCategories(completed).size).toBe(0)
  })

  it('handles no history without dividing by zero', () => {
    expect(favouredCategories([]).size).toBe(0)
    expect(favouredCategories([task()]).size).toBe(0)
  })
})

describe('maintenance', () => {
  it('prune drops stale interactions but keeps fresh ones', () => {
    recordInteraction('old', NOW - 40 * HOUR)
    recordInteraction('new', NOW - HOUR)
    pruneSignals(NOW)

    const signals = loadSignals(NOW)
    expect(signals.recentlyTouched.has('new')).toBe(true)
    expect(signals.recentlyTouched.has('old')).toBe(false)
  })

  it('clear wipes everything so the next user starts fresh', () => {
    recordInteraction('t1', NOW)
    for (let i = 0; i < 3; i += 1) recordIgnored('t2')

    clearSignals()

    const signals = loadSignals(NOW)
    expect(signals.recentlyTouched.size).toBe(0)
    expect(signals.repeatedlyIgnored.size).toBe(0)
  })
})
