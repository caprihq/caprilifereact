/**
 * The zones offered in Profile.
 *
 * A full IANA list is ~600 entries and searching it on a phone is worse than
 * useless; the web client ships a curated set for the same reason. The device's own
 * zone is always included even when it is not on that list, because the one zone a
 * user is most likely to want is the one they are standing in — and a zone already
 * saved is kept, so switching device never silently drops it.
 */
const COMMON_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
] as const

/** "Asia/Seoul" → "Seoul". The region is noise once the city is named. */
export const zoneLabel = (zone: string): string =>
  zone.split('/').at(-1)?.replace(/_/g, ' ') ?? zone

export const zoneOptions = (
  deviceZone: string,
  current: string | undefined,
): readonly { readonly value: string; readonly label: string }[] => {
  const zones = new Set<string>([deviceZone, ...(current ? [current] : []), ...COMMON_ZONES])

  return [...zones].map((zone) => ({
    value: zone,
    label: zone === deviceZone ? `${zoneLabel(zone)} (this device)` : zoneLabel(zone),
  }))
}
