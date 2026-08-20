import { useFeedbackStore } from '@/store'
import type { Feedback } from '@/store'

/**
 * Show a message. Thin wrapper over the feedback store so call sites read the
 * same as before, while only the Toast subscribes to changes.
 *
 * `show` is a stable store action, so it is safe in a dependency array.
 */
export const useFeedback = (): { readonly show: (feedback: Feedback) => void } => ({
  show: useFeedbackStore((state) => state.show),
})
