/**
 * Who a push is going to.
 *
 * Two answers, not three. The screen once offered a plan-shaped audience as well —
 * "everyone on Free", "everyone on Executive" — which read like a segmentation tool
 * but was not one: nobody had asked to message a tier, and the filter quietly missed
 * every legacy `pro` account, so "all Executive users" meant "some of them". A
 * control that is both unused and subtly wrong is worse than no control.
 *
 * What is left is what an admin actually does: send to everybody, or send to the
 * handful of people being tested on.
 *
 * Pure, so the rules about what a selection *means* are testable without a screen.
 */

export type AdminUser = {
  readonly id: string
  readonly email: string
  readonly display_name: string
  readonly plan: string
}

/** What the backend is told. `user_ids` when anyone is picked, otherwise everyone. */
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
 * Picking nobody means everybody. That is the one implicit rule on this screen, and
 * it is why the summary states it in words next to the send button rather than
 * leaving an empty selection to be read as "this will go nowhere".
 */
export const recipientsFor = (selected: readonly string[]): Recipients =>
  selected.length > 0 ? { user_ids: selected } : { audience: 'all' }

/** "Everyone", "1 person", "3 people" — what the send button is about to do. */
export const recipientSummary = (selected: readonly string[]): string => {
  if (selected.length === 0) return 'Everyone'
  if (selected.length === 1) return '1 person'

  return `${String(selected.length)} people`
}

/**
 * The picked people, as records rather than ids.
 *
 * Kept in list order rather than selection order so the summary on the compose screen
 * and the list on the picker read the same way round. Ids with no matching user are
 * dropped: the list can be refetched between picking and sending, and a deleted
 * account must not leave a blank row.
 */
export const selectedUsers = (
  users: readonly AdminUser[],
  selected: readonly string[],
): readonly AdminUser[] => users.filter((user) => selected.includes(user.id))
