import { upgradeCopy } from './upgradeCopy'
import type { GatedFeature } from './upgradeCopy'

const FEATURES: readonly GatedFeature[] = [
  'voice_limit',
  'task_limit',
  'whats_next',
  'auto_schedule',
  'subtasks',
  'recurring_tasks',
  'reprioritise',
]

describe('upgradeCopy', () => {
  it('says something specific for every gate', () => {
    // A gate that falls through to generic copy tells the user nothing about what
    // they just reached for, which is the whole failure this replaces.
    for (const feature of FEATURES) {
      const copy = upgradeCopy(feature)

      expect(copy.title.length).toBeGreaterThan(0)
      expect(copy.description.length).toBeGreaterThan(0)
      expect(copy.icon).toMatch(/-outline$/)
    }
  })

  it('names the free allowance where one exists', () => {
    // A limit you can see is one you can plan around, and it makes the upgrade a
    // concrete trade rather than a vague "more".
    expect(upgradeCopy('voice_limit').description).toContain('one a day')
    expect(upgradeCopy('whats_next').description).toContain('three')
  })

  it('falls back rather than rendering an empty dialog', () => {
    expect(upgradeCopy(null).title).toBe('An Executive feature')
  })

  it('gives each gate its own wording', () => {
    const titles = FEATURES.map((feature) => upgradeCopy(feature).title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
