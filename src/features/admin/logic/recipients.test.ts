import {
  recipientSummary,
  recipientsFor,
  searchUsers,
  selectedUsers,
  toggleSelected,
} from './recipients'
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
  it('sends to everyone when nobody is picked', () => {
    // The one implicit rule on the screen: an empty selection is not "send to nobody".
    expect(recipientsFor([])).toEqual({ audience: 'all' })
  })

  it('sends to the named people when there are any', () => {
    expect(recipientsFor(['1', '2'])).toEqual({ user_ids: ['1', '2'] })
  })
})

describe('recipientSummary', () => {
  it('says Everyone when nobody is picked', () => {
    expect(recipientSummary([])).toBe('Everyone')
  })

  it('counts people, and gets the singular right', () => {
    expect(recipientSummary(['1'])).toBe('1 person')
    expect(recipientSummary(['1', '2', '3'])).toBe('3 people')
  })
})

describe('selectedUsers', () => {
  it('resolves ids to people, in list order', () => {
    // Selection order is not list order; the receipt on the compose screen and the
    // ticks on the picker must not disagree about the order they read in.
    expect(selectedUsers(people, ['3', '1']).map((u) => u.id)).toEqual(['1', '3'])
  })

  it('drops an id with no matching user', () => {
    // The list is refetched between picking and sending, so an account can vanish
    // in between. A deleted user must not leave a blank row on the compose screen.
    expect(selectedUsers(people, ['1', 'deleted']).map((u) => u.id)).toEqual(['1'])
  })
})
