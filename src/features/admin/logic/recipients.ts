/**
 * Who a push is going to.
 *
 * An admin needs three answers, not one: everybody, a plan, or a handful of named
 * people. The screen used to offer a single email box, which covers only the middle
 * of that and makes "send to these four testers" impossible.
 *
 * Pure, so the rules about what a selection *means* are testable without a screen.
 */

export type AdminUser = {
  readonly id: string
  readonly email: string
  readonly display_name: string
  readonly plan: string
}

/** What the backend is told. `user_ids` wins over `audience` when both could apply. */
export type Recipients =
  | { readonly audience: string }
  | { readonly user_ids: readonly string[] }

/**
 * Narrow a list by a typed query.
 *
 * Matches name or email, case-insensitively. An admin looking for someone knows one
 * or the other, rarely both, and never the id.
 */
export const searchUsers = (users: readonly AdminUser[], query: string): readonly AdminUser[] => {
  const q = query.trim().toLowerCase()
  if (!q) return users

  return users.filter(
    (user) =>
      user.email.toLowerCase().includes(q) || user.display_name.toLowerCase().includes(q),
  )
}

/** Add or remove one person, without mutating the set handed in (§2.4). */
export const toggleSelected = (
  selected: readonly string[],
  id: string,
): readonly string[] =>
  selected.includes(id) ? selected.filter((other) => other !== id) : [...selected, id]

/**
 * What to send.
 *
 * Named people take precedence: if any are ticked, the audience is ignored. Sending
 * to "Everyone" *and* three selected people is not a coherent request, and silently
 * picking the larger of the two is how an admin messages the whole customer base
 * while believing they are testing.
 */
export const recipientsFor = (
  audience: string,
  selected: readonly string[],
): Recipients => (selected.length > 0 ? { user_ids: selected } : { audience })

/** "3 people", "Everyone", "Free plan" — what the send button is about to do. */
export const recipientSummary = (
  audienceLabel: string,
  selected: readonly string[],
): string => {
  if (selected.length === 0) return audienceLabel
  if (selected.length === 1) return '1 person'

  return `${String(selected.length)} people`
}
