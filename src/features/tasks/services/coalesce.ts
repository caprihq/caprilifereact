/**
 * Run `job` one at a time; calls made while it runs collapse into one more run.
 *
 * For the calendar sync. Accepting suggestions in quick succession started a sync
 * per accept, and two syncs running side by side both saw a task with no event yet —
 * so both created one, and the block appeared twice in Google Calendar. One run at a
 * time removes the race; the follow-up run makes sure the last change is not missed.
 */
export const coalesce = (job: () => Promise<void>): (() => Promise<void>) => {
  const state: { running: Promise<void> | null; again: boolean } = { running: null, again: false }

  const loop = async (): Promise<void> => {
    await job()
    if (!state.again) return
    state.again = false
    await loop()
  }

  return () => {
    if (state.running) {
      state.again = true
      return state.running
    }
    state.running = loop().finally(() => {
      state.running = null
    })
    return state.running
  }
}
