import { emptyPlanNotice, moreToPlanCaption, plannerCaption } from './autoScheduleNotice'

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

  it('does not call a fully planned list clear', () => {
    // Every task already has a future time: true that nothing is new, false that
    // the list is empty.
    const notice = emptyPlanNotice({ reason: 'all_planned' })

    expect(notice.message).toContain('already has a time')
    expect(notice.message).not.toContain('clear')
  })

  it('falls back rather than echoing a reason it does not recognise', () => {
    const notice = emptyPlanNotice({ reason: 'pg_pool_exhausted' })

    expect(notice.message).not.toContain('pg_pool')
    expect(notice.tone).toBe('info')
  })
})

describe('plannerCaption', () => {
  it('says nothing when the AI planned', () => {
    expect(plannerCaption('ok')).toBeNull()
    expect(plannerCaption(undefined)).toBeNull()
  })

  it('explains a rules-only plan, and why', () => {
    expect(plannerCaption('daily_limit')).toContain("today's AI plans")
    expect(plannerCaption('unavailable')).toContain("couldn't be reached")
  })

  it("keeps an operator problem off the user's screen", () => {
    // No model key on the server is not something the user can fix.
    expect(plannerCaption('not_configured')).toBeNull()
  })
})

describe('moreToPlanCaption', () => {
  it('counts what is left, in words', () => {
    expect(moreToPlanCaption(1)).toBe('1 more task to plan. Accept these, then run it again.')
    expect(moreToPlanCaption(4)).toContain('4 more tasks')
  })

  it('is silent when nothing is left', () => {
    expect(moreToPlanCaption(0)).toBeNull()
    expect(moreToPlanCaption(undefined)).toBeNull()
  })
})
