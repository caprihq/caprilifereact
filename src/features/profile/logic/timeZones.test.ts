import { zoneLabel, zoneOptions } from './timeZones'

describe('zoneLabel', () => {
  it('names the city, because the region is noise', () => {
    expect(zoneLabel('Asia/Seoul')).toBe('Seoul')
    expect(zoneLabel('America/New_York')).toBe('New York')
    expect(zoneLabel('UTC')).toBe('UTC')
  })
})

describe('zoneOptions', () => {
  it('always offers the device zone, marked, even off the curated list', () => {
    // The one zone a user is most likely to want is the one they are standing in.
    const options = zoneOptions('Africa/Nairobi', undefined)

    expect(options[0]).toEqual({ value: 'Africa/Nairobi', label: 'Nairobi (this device)' })
  })

  it('keeps a saved zone that is not on the list, so it is never silently dropped', () => {
    const options = zoneOptions('Europe/London', 'Antarctica/Troll')

    expect(options.map((option) => option.value)).toContain('Antarctica/Troll')
  })

  it('lists each zone once when the device zone is already curated', () => {
    const values = zoneOptions('Asia/Tokyo', 'Asia/Tokyo').map((option) => option.value)

    expect(values.filter((value) => value === 'Asia/Tokyo')).toHaveLength(1)
  })
})
