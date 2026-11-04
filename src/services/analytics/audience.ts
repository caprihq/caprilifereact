import type { User } from '@/types/entities'

/**
 * Who the numbers are about: our own team, or a real customer; a new account, or an
 * existing one.
 *
 * Both questions decide whether a report can be trusted. Since 3.0 went live, the
 * same Firebase project hears from App Store customers and from everyone testing the
 * app, and nothing told them apart. The build is tagged natively (AppDelegate, as
 * `build_type`); this is the account half.
 *
 * Pure: no Firebase, no storage, so every rule here is tested directly.
 */

/**
 * Accounts on these domains are the team's own.
 *
 * Other test accounts are covered by the Base44 `admin` role, or by testing on a
 * TestFlight build, which `build_type` already separates.
 */
export const INTERNAL_EMAIL_DOMAINS: readonly string[] = ['caprihq.com']

/**
 * How long an account counts as new, for the activation events.
 *
 * Without a limit, every existing customer would record a "first" Up Next
 * recommendation the day this release reached them, and the activation numbers for
 * that week would be mostly people who activated months ago.
 */
export const ACTIVATION_WINDOW_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

const domainOf = (email: string): string =>
  email.slice(email.lastIndexOf('@') + 1).toLowerCase()

export const isInternalAccount = (user: Pick<User, 'email' | 'role'>): boolean =>
  user.role === 'admin' || INTERNAL_EMAIL_DOMAINS.includes(domainOf(user.email))

const DATE_PART = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Whole days since the account was created, or null when that is unknown.
 *
 * Only the date part is read. Base44 timestamps may carry microseconds and no zone,
 * which not every JavaScript engine parses, and a day count needs neither. A missing
 * or unreadable date must not make an old account look brand new.
 */
export const daysSinceSignup = (
  createdDate: string | undefined,
  nowMs: number,
): number | null => {
  const match = DATE_PART.exec(createdDate ?? '')
  if (!match) return null
  const createdMs = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Math.max(0, Math.floor((nowMs - createdMs) / DAY_MS))
}

export const isNewAccount = (days: number | null): days is number =>
  days !== null && days <= ACTIVATION_WINDOW_DAYS

/**
 * The user properties set at sign-in, so every later event can be read by them.
 *
 * `internal_user` is only ever set, never cleared. Firebase keeps a user property on
 * the device, so a phone a team member has signed in on stays marked after they sign
 * out, which is the point: what they do next while logged out is still testing.
 */
export const userPropertiesFor = (
  user: Pick<User, 'email' | 'role' | 'plan'>,
): Readonly<Record<string, string>> => ({
  plan: user.plan ?? 'free',
  ...(isInternalAccount(user) ? { internal_user: 'yes' } : {}),
})
