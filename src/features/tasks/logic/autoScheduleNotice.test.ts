import { emptyPlanNotice } from './autoScheduleNotice'

describe('emptyPlanNotice', () => {
  it('congratulates an empty list instead of reporting a failure', () => {
    const notice = emptyPlanNotice({ reason: 'no_pending_tasks' })

    expect(notice.tone).toBe('success')
    expect(notice.message).toContain('clear')
  })

  it('names the hours it searched, and what to do about them', () => {
    const notice = emptyPlanNotice({
      reason: 'no_free_slots',
      workHours: { start: 9, end: 18 },
    })

    expect(notice.message).toContain('between 09:00 and 18:00')
    expect(notice.message).toContain('Widen your work hours')
    expect(notice.tone).toBe('warning')
  })

  it('still reads as a sentence when the hours are missing', () => {
    // An older backend sends no work_hours; the copy must not say "between  and ".
    const notice = emptyPlanNotice({ reason: 'no_free_slots' })

    expect(notice.message).toContain('No free time in the next seven days')
    expect(notice.message).not.toContain('between')
  })

  it('falls back rather than echoing a reason it does not recognise', () => {
    const notice = emptyPlanNotice({ reason: 'pg_pool_exhausted' })

    expect(notice.message).not.toContain('pg_pool')
    expect(notice.tone).toBe('info')
  })
})
