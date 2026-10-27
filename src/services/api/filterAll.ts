/**
 * Every row a query matches, not the first 50.
 *
 * Base44 returns 50 rows when no limit is given, and at most 5,000 per request. A
 * plain `filter(query)` therefore stopped at 50 without saying so: past that, a
 * user's lowest-priority tasks — and unscored new ones, which sort last — quietly
 * dropped out of the app, and older commitments vanished from their day.
 *
 * Pages until a short page comes back. Rows are de-duplicated by id, because a row
 * created between two requests can shift the next page by one.
 */

export const PAGE_SIZE = 5000
/** A runaway stop, far past any real account: 100,000 rows. */
const MAX_PAGES = 20

type Page<T> = (limit: number, skip: number) => Promise<readonly T[]>

export const allPages = async <T extends { readonly id: string }>(page: Page<T>): Promise<T[]> => {
  const rows: T[] = []
  const seen = new Set<string>()
  for (let index = 0; index < MAX_PAGES; index += 1) {
    const batch = await page(PAGE_SIZE, index * PAGE_SIZE)
    for (const row of batch) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      rows.push(row)
    }
    if (batch.length < PAGE_SIZE) break
  }
  return rows
}
