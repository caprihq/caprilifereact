import { HOME_LINK_PATH, TASK_LINK_PATH, normalizeLinkPath, taskPathFor } from './constants'

describe('normalizeLinkPath', () => {
  it('reads the bare scheme as Home', () => {
    // `capri://` arrives as an empty path. Unmatched, it leaves the app wherever it
    // was — which is how the widget came to reopen Profile.
    expect(normalizeLinkPath('')).toBe(HOME_LINK_PATH)
    expect(normalizeLinkPath('/')).toBe(HOME_LINK_PATH)
    expect(normalizeLinkPath('//')).toBe(HOME_LINK_PATH)
  })

  it('treats a query or fragment alone as still empty', () => {
    expect(normalizeLinkPath('?utm=widget')).toBe(HOME_LINK_PATH)
    expect(normalizeLinkPath('/#top')).toBe(HOME_LINK_PATH)
  })

  it('leaves a real path untouched, exactly as given', () => {
    expect(normalizeLinkPath(HOME_LINK_PATH)).toBe(HOME_LINK_PATH)
    expect(normalizeLinkPath(taskPathFor('abc'))).toBe(`${TASK_LINK_PATH}/abc`)
    expect(normalizeLinkPath('/task/abc?x=1')).toBe('/task/abc?x=1')
  })
})
