import { openSourceOf } from './openSource'

describe('openSourceOf', () => {
  it('treats every parked link as a reminder tap', () => {
    // Only the app delegate's notification handler parks links.
    expect(openSourceOf('capri://task/abc', 'parked')).toBe('notification')
  })

  it('attributes the widget’s two links to the widget', () => {
    expect(openSourceOf('capri://home', 'opened')).toBe('widget')
    expect(openSourceOf('capri://task/abc123', 'opened')).toBe('widget')
  })

  it('counts https links as shared links', () => {
    expect(openSourceOf('https://capriforlifev1.base44.app/task/abc', 'opened')).toBe('link')
    expect(
      openSourceOf('https://capriforlifev1.base44.app/reset-password?token=x', 'opened'),
    ).toBe('link')
  })

  it('ignores links that are not an open, such as the sign-in return', () => {
    expect(openSourceOf('capri://auth?access_token=x', 'opened')).toBeNull()
    expect(openSourceOf('capri://', 'opened')).toBeNull()
  })
})
