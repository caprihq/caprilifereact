import { create } from 'zustand'

/**
 * The push an admin is composing.
 *
 * A store rather than screen state because choosing recipients is now its own screen.
 * A pushed screen cannot hand values back to the one beneath it without either route
 * params — which would make the compose screen re-read and re-sync a list on every
 * focus — or a callback in params, which React Navigation warns about because it is
 * not serialisable. One shared draft is simpler than either, and it has a second
 * benefit: the message survives the trip to the picker and back.
 *
 * Not persisted. A half-written broadcast is not something to restore days later.
 */

type BroadcastState = {
  readonly title: string
  readonly body: string
  /** Empty means everyone — see `recipientsFor`. */
  readonly selected: readonly string[]
  /** Lives here so returning to the picker resumes where the admin left off. */
  readonly query: string

  readonly setTitle: (next: string) => void
  readonly setBody: (next: string) => void
  readonly setSelected: (next: readonly string[]) => void
  readonly setQuery: (next: string) => void
  /** Cleared after a send, so the next message starts from nothing. */
  readonly reset: () => void
}

export const useBroadcastStore = create<BroadcastState>((set) => ({
  title: '',
  body: '',
  selected: [],
  query: '',

  setTitle: (title) => { set({ title }) },
  setBody: (body) => { set({ body }) },
  setSelected: (selected) => { set({ selected }) },
  setQuery: (query) => { set({ query }) },
  reset: () => { set({ title: '', body: '', selected: [], query: '' }) },
}))
