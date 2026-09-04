import { captureCaption } from './TaskCaptureStep'

/**
 * The caption under the mic is the only thing telling a user what state the
 * microphone is in, so each state has to say something different and true.
 */
describe('captureCaption', () => {
  it('invites both ways in when idle', () => {
    expect(captureCaption({ listening: false, limitReached: false })).toBe(
      'Tap to speak, or type below',
    )
  })

  it('confirms the mic is open, and how to stop', () => {
    // A recognizer takes seconds over a sentence; without this the screen looks
    // frozen and users tap the button again, cancelling their own recording.
    expect(captureCaption({ listening: true, limitReached: false })).toBe(
      'Listening… tap to stop',
    )
  })

  it('explains a disabled mic instead of leaving it dead', () => {
    // A greyed-out button with no reason reads as a bug rather than a plan limit.
    expect(captureCaption({ listening: false, limitReached: true })).toBe(
      'Daily voice limit reached — type below',
    )
  })

  it('still reports listening if the limit is reached mid-capture', () => {
    // The cap is counted when a capture completes, so a live recording must not
    // suddenly claim to be blocked.
    expect(captureCaption({ listening: true, limitReached: true })).toBe(
      'Listening… tap to stop',
    )
  })
})
