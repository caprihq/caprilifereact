import {
  COMPLETION_CONFIRM_LABEL,
  COMPLETION_MESSAGE,
  completionTitle,
} from './completionPrompt'

describe('completionTitle', () => {
  it('names the task, so the question can be answered', () => {
    expect(completionTitle({ id: '1', title: 'Call the bank', status: 'pending' })).toBe(
      'Mark "Call the bank" done?',
    )
  })

  it('is empty when nothing is pending, so a closed dialog holds no stale name', () => {
    expect(completionTitle(null)).toBe('')
  })
})

describe('the confirmation wording', () => {
  it('names the outcome instead of saying OK', () => {
    // A button labelled "OK" makes the user reconstruct what they are agreeing to.
    expect(COMPLETION_CONFIRM_LABEL).toBe('Mark done')
  })

  it('says where the task goes, so the answer is informed', () => {
    expect(COMPLETION_MESSAGE).toContain('Done')
  })
})
