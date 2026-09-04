import { fallbackPriority } from './priorityFallback'

const NOW = Date.parse('2026-09-03T12:00:00Z')

const priority = (title: string, dueDate?: string, category?: 'work' | 'personal') =>
  fallbackPriority({ title, dueDate, category, nowMs: NOW })

describe('fallbackPriority', () => {
  it('gives a plain task a real score rather than nothing', () => {
    // A task with no score sinks below everything in a list sorted on priority_score,
    // which is what every task created in this app used to do.
    expect(priority('Water the plants')).toEqual({ priority: 'medium', priority_score: 30 })
  })

  it('hears the words people use when something cannot wait', () => {
    // 30 + 40 = 70, and 30 + 20 = 50: both land above a plain task's medium.
    expect(priority('URGENT: call the bank').priority).toBe('high')
    expect(priority('Important: renew passport').priority).toBe('high')
    expect(priority('Renew passport').priority).toBe('medium')
  })

  it('counts the loudest word once, not every word', () => {
    // 30 + 40, not 30 + 40 + 20: the web version is an if/else and this must match.
    expect(priority('Urgent and important deadline').priority_score).toBe(70)
  })

  it('treats an overdue task as the most urgent thing there is', () => {
    expect(priority('File taxes', '2026-09-01T12:00:00Z')).toEqual({
      priority: 'critical',
      priority_score: 75,
    })
  })

  it('scales the deadline bonus by how close it is', () => {
    expect(priority('Draft', '2026-09-03T18:00:00Z').priority_score).toBe(65)
    expect(priority('Draft', '2026-09-05T12:00:00Z').priority_score).toBe(50)
    expect(priority('Draft', '2026-09-08T12:00:00Z').priority_score).toBe(40)
    expect(priority('Draft', '2026-10-08T12:00:00Z').priority_score).toBe(30)
  })

  it('nudges categories that carry consequences', () => {
    expect(priority('Invoice', undefined, 'work').priority_score).toBe(40)
    expect(priority('Invoice', undefined, 'personal').priority_score).toBe(30)
  })

  it('caps at 100 so the score stays a percentage', () => {
    expect(priority('Urgent overdue deadline', '2026-08-01T12:00:00Z', 'work')).toEqual({
      priority: 'critical',
      priority_score: 100,
    })
  })

  it('ignores an unparseable due date instead of scoring NaN', () => {
    expect(priority('Draft', 'not a date').priority_score).toBe(30)
  })
})
