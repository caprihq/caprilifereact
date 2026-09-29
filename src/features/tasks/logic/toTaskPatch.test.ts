import { toTaskPatch } from './toTaskPatch'
import type { ParsedTask } from './parseTaskInput'

const draft = (overrides: Partial<ParsedTask> = {}): ParsedTask => ({
  title: 'Task',
  ...overrides,
})

describe('toTaskPatch', () => {
  it('sends notes, which the app previously dropped on every edit', () => {
    // A description written on the web was invisible here *and* wiped by the next
    // save from this app, because the patch never carried the field.
    expect(toTaskPatch(draft({ description: '  call the bank  ' }))).toEqual({
      title: 'Task',
      description: 'call the bank',
    })
  })

  it('omits fields the user never touched, rather than clearing them', () => {
    // Base44 leaves an absent field alone. Sending `undefined` values would be
    // meaningless; sending nulls would erase data the form never showed.
    expect(toTaskPatch(draft())).toEqual({ title: 'Task' })
  })

  it('clears the recurrence end date when a task repeats without one', () => {
    // Null, explicitly: an omitted field would leave a stale stop date on a series
    // the user just changed.
    expect(toTaskPatch(draft({ recurrence: 'weekly' }))).toEqual({
      title: 'Task',
      recurrence: 'weekly',
      recurrence_end_date: null,
    })
  })

  it('carries the end date when there is one', () => {
    expect(
      toTaskPatch(draft({ recurrence: 'daily', recurrence_end_date: '2026-12-31T00:00:00Z' })),
    ).toEqual({
      title: 'Task',
      recurrence: 'daily',
      recurrence_end_date: '2026-12-31T00:00:00Z',
    })
  })

  it('marks a commitment, and unmarks one', () => {
    // Both directions travel. This test used to assert that `false` was omitted "to
    // avoid noise" — but Base44 leaves an omitted field alone, so that silence was
    // what made "Scheduled event" a one-way switch.
    expect(toTaskPatch(draft({ is_scheduled_event: true })).is_scheduled_event).toBe(true)
    expect(toTaskPatch(draft({ is_scheduled_event: false }))).toEqual({
      title: 'Task',
      is_scheduled_event: false,
    })
  })

  it('still says nothing when the draft never had the field', () => {
    expect(toTaskPatch(draft())).not.toHaveProperty('is_scheduled_event')
  })
})

describe('toTaskPatch — a description that is not a string', () => {
  it('survives null, which is what the API sends for empty notes', () => {
    // This threw "Cannot read property 'trim' of null" on save for every task with
    // no notes. The entity type says `string | undefined`, so it compiled; the value
    // is null all the same.
    const draft = { title: 'T', description: null } as unknown as ParsedTask

    expect(() => toTaskPatch(draft)).not.toThrow()
    expect(toTaskPatch(draft)).not.toHaveProperty('description')
  })

  it('still sends an empty string, which means "clear the notes"', () => {
    // Distinct from null: the user emptied the field on purpose.
    expect(toTaskPatch({ title: 'T', description: '  ' })).toMatchObject({ description: '' })
  })
})

describe('toTaskPatch — a scheduled event needs an anchor', () => {
  it('sends the start time, which is what places it on Today’s Commitments', () => {
    // Without this the field was on the entity and in no patch, so an event had no
    // anchor: dropped from the timeline, from Today's Plan, and from the ranking it
    // had just been excluded from. It existed and appeared nowhere.
    const patch = toTaskPatch({
      title: 'Dentist',
      is_scheduled_event: true,
      scheduled_start_time: '2026-09-17T14:30:00.000Z',
    })

    expect(patch).toMatchObject({
      is_scheduled_event: true,
      scheduled_start_time: '2026-09-17T14:30:00.000Z',
    })
  })

  it('omits the start time for ordinary work that never had one', () => {
    expect(toTaskPatch({ title: 'T' })).not.toHaveProperty('scheduled_start_time')
  })
})

describe('toTaskPatch — an event has to occupy time', () => {
  it('derives the end from the start and the duration', () => {
    // `autoScheduleTasks` counts a task as busy only when it has both a start and an
    // end. With a start alone the appointment read as free time and CAPRI would plan
    // work straight over it — the exact thing the flag exists to prevent.
    const patch = toTaskPatch({
      title: 'Dentist',
      is_scheduled_event: true,
      scheduled_start_time: '2026-09-17T14:00:00.000Z',
      estimated_minutes: 45,
    })

    expect(patch.scheduled_end_time).toBe('2026-09-17T14:45:00.000Z')
  })

  it('falls back to half an hour when no duration was given', () => {
    const patch = toTaskPatch({
      title: 'Dentist',
      is_scheduled_event: true,
      scheduled_start_time: '2026-09-17T14:00:00.000Z',
    })

    expect(patch.scheduled_end_time).toBe('2026-09-17T14:30:00.000Z')
  })

  it('writes no end when there is no start to measure from', () => {
    expect(toTaskPatch({ title: 'T', estimated_minutes: 45 })).not.toHaveProperty(
      'scheduled_end_time',
    )
  })
})
