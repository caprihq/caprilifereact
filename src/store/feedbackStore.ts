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

export type Feedback = {
  readonly message: string
  /** Present when the action can be reversed. */
  readonly undo?: (() => void) | undefined
  readonly isError?: boolean
}

type FeedbackState = {
  readonly current: Feedback | null
  readonly show: (feedback: Feedback) => void
  readonly dismiss: () => void
}

export const useFeedbackStore = create<FeedbackState>()((set) => ({
  current: null,
  show: (feedback) => set({ current: feedback }),
  dismiss: () => set({ current: null }),
}))

/** For non-React callers. */
export const showFeedback = (feedback: Feedback): void => {
  useFeedbackStore.getState().show(feedback)
}
