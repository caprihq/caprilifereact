import type { User } from '@/types/entities'

/**
 * A name worth greeting someone by, or nothing.
 *
 * Base44 fills `full_name` from the email address at registration, so an account
 * that never set a name carries something like `codehatchdev927` — and the app
 * greeted people with it, in a heading, as though that were their name. It reads as
 * broken data, and the fix is not a better fallback string: it is recognising that
 * the value is not a name at all.
 *
 * A name that matches the email's local part is treated as absent. Greeting someone
 * as "Good afternoon" is unremarkable; greeting them as "codehatchdev927" is not.
 */
export const realName = (user: User | undefined): string | null => {
  const name = (user?.display_name ?? user?.full_name ?? '').trim()
  if (!name) return null

  const localPart = (user?.email ?? '').split('@')[0]?.trim().toLowerCase()
  if (localPart && name.toLowerCase() === localPart) return null

  return name
}

/** Just the first word, for a greeting. */
export const firstNameOf = (user: User | undefined): string | null =>
  realName(user)?.split(' ')[0] ?? null
