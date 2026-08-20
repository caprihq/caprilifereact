import type { Subtask } from '@/types/entities'
import {
  addSubtask,
  nextSubtaskId,
  removeSubtask,
  renameSubtask,
  subtaskProgress,
  subtasksFromTitles,
  toggleSubtask,
} from './subtasks'

const NOW = 1_700_000_000_000

const list = (...titles: string[]): readonly Subtask[] =>
  titles.map((title, index) => ({ id: String(index), title, completed: false }))

describe('subtask ids', () => {
  it('never reuses an id already in the list', () => {
    // The web version used Date.now() alone, so two subtasks added inside the
    // same millisecond shared an id — and the id is the React key.
    const first = addSubtask([], 'One', NOW)
    const second = addSubtask(first, 'Two', NOW)
    const third = addSubtask(second, 'Three', NOW)

    const ids = third.map((subtask) => subtask.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('uses the plain timestamp when nothing collides', () => {
    expect(nextSubtaskId([], NOW)).toBe(String(NOW))
  })
})

describe('subtask mutations', () => {
  it('never mutates the input array', () => {
    const original = list('One', 'Two')
    const snapshot = [...original]

    toggleSubtask(original, '0')
    removeSubtask(original, '0')
    renameSubtask(original, '0', 'Changed')
    addSubtask(original, 'Three', NOW)

    expect(original).toEqual(snapshot)
  })

  it('toggles only the addressed subtask', () => {
    const toggled = toggleSubtask(list('One', 'Two'), '1')
    expect(toggled[0]?.completed).toBe(false)
    expect(toggled[1]?.completed).toBe(true)
  })

  it('toggles back off', () => {
    const once = toggleSubtask(list('One'), '0')
    expect(toggleSubtask(once, '0')[0]?.completed).toBe(false)
  })

  it('trims a rename and rejects an empty one', () => {
    expect(renameSubtask(list('One'), '0', '  Tidied  ')[0]?.title).toBe('Tidied')
    expect(renameSubtask(list('One'), '0', '   ')[0]?.title).toBe('One')
  })

  it('ignores an unknown id rather than throwing', () => {
    const original = list('One')
    expect(toggleSubtask(original, 'missing')).toEqual(original)
    expect(removeSubtask(original, 'missing')).toEqual(original)
  })
})

describe('subtaskProgress', () => {
  it('reports zero ratio for an empty list instead of dividing by zero', () => {
    expect(subtaskProgress([])).toEqual({ completed: 0, total: 0, ratio: 0 })
  })

  it('counts completed against total', () => {
    const half = toggleSubtask(list('One', 'Two'), '0')
    expect(subtaskProgress(half)).toEqual({ completed: 1, total: 2, ratio: 0.5 })
  })
})

describe('subtasksFromTitles', () => {
  it('gives every AI-generated title a distinct id', () => {
    const built = subtasksFromTitles(['Draft outline', 'Book room', 'Send invites'], NOW)
    expect(built).toHaveLength(3)
    expect(new Set(built.map((subtask) => subtask.id)).size).toBe(3)
    expect(built.every((subtask) => !subtask.completed)).toBe(true)
  })

  it('preserves the order the AI returned', () => {
    const built = subtasksFromTitles(['First', 'Second'], NOW)
    expect(built.map((subtask) => subtask.title)).toEqual(['First', 'Second'])
  })
})
