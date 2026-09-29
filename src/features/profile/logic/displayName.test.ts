import { firstNameOf, realName } from './displayName'
import type { User } from '@/types/entities'

const user = (over: Partial<User> = {}): User => ({
  id: 'u1',
  email: 'codehatchdev927@gmail.com',
  ...over,
})

describe('realName', () => {
  it('rejects the email local part Base44 fills in at signup', () => {
    // The account showed "codehatchdev927" as a heading and in the greeting.
    expect(realName(user({ full_name: 'codehatchdev927' }))).toBeNull()
  })

  it('ignores case when matching the local part', () => {
    expect(realName(user({ full_name: 'CodeHatchDev927' }))).toBeNull()
  })

  it('keeps a name someone actually chose', () => {
    expect(realName(user({ display_name: 'Ky' }))).toBe('Ky')
  })

  it('prefers the chosen name over the generated one', () => {
    expect(realName(user({ display_name: 'Ky', full_name: 'codehatchdev927' }))).toBe('Ky')
  })

  it('is null when nothing is set', () => {
    expect(realName(user())).toBeNull()
    expect(realName(undefined)).toBeNull()
  })

  it('does not reject a real name that merely resembles an address', () => {
    expect(realName(user({ email: 'ky@capri.app', display_name: 'Ky Luong' }))).toBe('Ky Luong')
  })
})

describe('firstNameOf', () => {
  it('greets by first name only', () => {
    expect(firstNameOf(user({ display_name: 'Ky Luong' }))).toBe('Ky')
  })

  it('gives nothing to greet with rather than a username', () => {
    expect(firstNameOf(user({ full_name: 'codehatchdev927' }))).toBeNull()
  })
})
