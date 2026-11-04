import { planningWindow } from './planningWindow'
import type { User } from '@/types/entities'

const user = (over: Partial<User> = {}): User => ({ id: 'u1', email: 'a@b.c', ...over })

describe('planningWindow', () => {
  it('names the hours the user actually set', () => {
    // The old caption said 9am–6pm no matter what Profile said, so the two screens
    // contradicted each other for anyone who had changed their hours.
    expect(planningWindow(user({ work_hours_start: '07:00', work_hours_end: '15:00' }))).toBe(
      'Work tasks go between 7 AM and 3 PM. Personal plans can go between 7 AM and 10 PM.',
    )
  })

  it('falls back to the default rather than inventing hours', () => {
    expect(planningWindow(user())).toBe(
      'Work tasks go between 9 AM and 6 PM. Personal plans can go between 7 AM and 10 PM.',
    )
  })

  it('survives a half-answered profile', () => {
    expect(planningWindow(user({ work_hours_start: '10:00' }))).toBe(
      'Work tasks go between 10 AM and 6 PM. Personal plans can go between 7 AM and 10 PM.',
    )
  })

  it('widens the personal day to include work hours that run past it', () => {
    // A 6am–11pm workday must not read as personal plans stopping before work does.
    expect(planningWindow(user({ work_hours_start: '06:00', work_hours_end: '23:00' }))).toBe(
      'Work tasks go between 6 AM and 11 PM. Personal plans can go between 6 AM and 11 PM.',
    )
  })
})
