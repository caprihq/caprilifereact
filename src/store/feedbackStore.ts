import { create } from 'zustand'

/**
 * Transient user feedback — the toast with an optional Undo.
 *
 * A store rather than a provider for a concrete reason: the old
 * `FeedbackProvider` wrapped the entire tree, so every toast re-rendered every
 * screen beneath it. Here only the toast component subscribes.
 *
 * It is also callable from outside React — a mutation's `onError` in a service
 * can report failure without being handed a callback.
 */

/**
 * How a message should read.
 *
 * `isError: boolean` used to be the whole vocabulary, which forced every message
 * into one of two shapes: a confirmation or a red failure. A free-plan limit is
 * neither — nothing went wrong, and the user is not being congratulated — so those
 * notices were dressed as errors, and "Free plan allows 3 refreshes a day" arrived
 * looking like a fault in the app.
 */
export type FeedbackTone = 'success' | 'info' | 'warning' | 'error'

export type Feedback = {
  readonly message: string
  /** Present when the action can be reversed. */
  readonly undo?: (() => void) | undefined
  /** Defaults to `info`: a message with nothing claimed about it. */
  readonly tone?: FeedbackTone | undefined
}

type FeedbackState = {
  readonly current: Feedback | null
  /**
   * How many sheet-level hosts are mounted.
   *
   * **This is what makes a message visible inside a sheet at all.** The single host
   * lives at the app root, and `formSheet`/`modal` screens are separate native view
   * controllers presented *above* the root view — so every notice raised from Add
   * Task, Task Detail, the commitment form or the suggested plan was rendering
   * faithfully underneath the sheet the user was looking at. Reaching a free-plan
   * limit, or failing to save, showed nothing whatsoever.
   *
   * A sheet mounts its own host, and while one exists the root host stands down, so
   * a message is shown once rather than twice on Android, where the two share a
   * window.
   */
  readonly sheetHosts: number
  readonly show: (feedback: Feedback) => void
  readonly dismiss: () => void
  readonly addSheetHost: () => void
  readonly removeSheetHost: () => void
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  current: null,
  sheetHosts: 0,
  show: (feedback) => set({ current: feedback }),
  dismiss: () => set({ current: null }),
  addSheetHost: () => set((state) => ({ sheetHosts: state.sheetHosts + 1 })),
  removeSheetHost: () => set((state) => ({ sheetHosts: Math.max(0, state.sheetHosts - 1) })),
}))

/** For non-React callers. */
export const showFeedback = (feedback: Feedback): void => {
  useFeedbackStore.getState().show(feedback)
}
