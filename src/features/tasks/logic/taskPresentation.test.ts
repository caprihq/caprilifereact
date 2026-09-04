import { bandFor, durationLabel, emojiFor, subtaskProgress, subtitleFor } from './taskPresentation'
import type { Task } from '@/types/entities'

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  title: 'Task',
  status: 'pending',
  ...overrides,
})

describe('bandFor', () => {
  it('falls back to medium for anything unset or unknown', () => {
    // Priority arrives from the API as a plain string, so a value outside the enum
    // is possible and must not colour a card by accident.
    expect(bandFor(task())).toBe('medium')
    // Cast deliberately: the type narrows the enum, but the API returns a plain
    // string and a value outside it must not colour a card by accident.
    expect(bandFor({ ...task(), priority: 'urgent' } as unknown as Task)).toBe('medium')
    expect(bandFor(task({ priority: 'critical' }))).toBe('critical')
  })
})

describe('emojiFor', () => {
  it('has a glyph for every category, and a fallback', () => {
    expect(emojiFor(task({ category: 'work' }))).toBe('💼')
    expect(emojiFor({ category: 'nonsense' })).toBe('📌')
    expect(emojiFor(task())).toBe('📌')
  })
})

describe('subtitleFor', () => {
  it("prefers CAPRI's reason over the user's description", () => {
    // The reason is the product's answer to "why is this in front of me"; the
    // description is on the detail screen either way.
    const both = task({ priority_reason: 'Due soonest', description: 'Long notes' })
    expect(subtitleFor(both)).toEqual({ text: 'Due soonest', isReason: true })
  })

  it('falls back to the description, and to nothing', () => {
    expect(subtitleFor(task({ description: 'Long notes' }))).toEqual({
      text: 'Long notes',
      isReason: false,
    })
    expect(subtitleFor(task())).toBeNull()
    // Whitespace is not content: it would render an empty line under the title.
    expect(subtitleFor(task({ priority_reason: '   ', description: '' }))).toBeNull()
  })
})

describe('subtaskProgress', () => {
  it('counts what is done out of the total, or nothing at all', () => {
    const withSubtasks = task({
      subtasks: [
        { id: 's1', title: 'a', completed: true },
        { id: 's2', title: 'b', completed: false },
        { id: 's3', title: 'c', completed: true },
      ],
    })
    expect(subtaskProgress(withSubtasks)).toBe('2/3')
    expect(subtaskProgress(task({ subtasks: [] }))).toBeNull()
    expect(subtaskProgress(task())).toBeNull()
  })
})

describe('durationLabel', () => {
  it('reads as a person would say it', () => {
    expect(durationLabel(task({ estimated_minutes: 45 }))).toBe('45m')
    expect(durationLabel(task({ estimated_minutes: 60 }))).toBe('1h')
    expect(durationLabel(task({ estimated_minutes: 90 }))).toBe('1h 30m')
  })

  it('shows nothing rather than "0m" when there is no estimate', () => {
    expect(durationLabel(task())).toBeNull()
    expect(durationLabel(task({ estimated_minutes: 0 }))).toBeNull()
  })
})
