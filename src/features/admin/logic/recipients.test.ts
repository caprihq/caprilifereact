import { recipientSummary, recipientsFor, searchUsers, toggleSelected } from './recipients'
import type { AdminUser } from './recipients'

const user = (id: string, email: string, name = ''): AdminUser => ({
  id,
  email,
  display_name: name,
  plan: 'free',
})

const people = [
  user('1', 'ada@example.com', 'Ada Lovelace'),
  user('2', 'grace@example.com', 'Grace Hopper'),
  user('3', 'alan@example.com'),
]

describe('searchUsers', () => {
  it('matches an email', () => {
    expect(searchUsers(people, 'grace').map((u) => u.id)).toEqual(['2'])
  })

  it('matches a name, which is often all an admin remembers', () => {
    expect(searchUsers(people, 'lovelace').map((u) => u.id)).toEqual(['1'])
  })

  it('ignores case and surrounding space', () => {
    expect(searchUsers(people, '  ADA  ').map((u) => u.id)).toEqual(['1'])
  })

  it('returns everyone for an empty query rather than nobody', () => {
    expect(searchUsers(people, '   ')).toHaveLength(3)
  })
})

describe('toggleSelected', () => {
  it('adds and removes without mutating what it was given', () => {
    const before = ['1']
    expect(toggleSelected(before, '2')).toEqual(['1', '2'])
    expect(toggleSelected(['1', '2'], '1')).toEqual(['2'])
    expect(before).toEqual(['1'])
  })
})

describe('recipientsFor', () => {
  it('sends to the audience when nobody is picked', () => {
    expect(recipientsFor('free', [])).toEqual({ audience: 'free' })
  })

  it('lets named people win over the audience', () => {
    // "Everyone" *and* three selected people is not a coherent request, and choosing
    // the larger of the two is how a test message reaches every customer.
    expect(recipientsFor('all', ['1', '2'])).toEqual({ user_ids: ['1', '2'] })
  })
})

describe('recipientSummary', () => {
  it('names the audience when nobody is picked', () => {
    expect(recipientSummary('Everyone', [])).toBe('Everyone')
  })

  it('counts people, and gets the singular right', () => {
    expect(recipientSummary('Everyone', ['1'])).toBe('1 person')
    expect(recipientSummary('Everyone', ['1', '2', '3'])).toBe('3 people')
  })
})
