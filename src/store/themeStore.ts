import { Appearance } from 'react-native'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { isAccentName } from '@/theme'
import type { AccentName, ThemeMode } from '@/theme'
import { zustandMmkvStorage } from '@/services/storage'

/**
 * The user's appearance choice: an accent, and light/dark or "follow the system".
 *
 * **Plain state, no native calls.** This used to push every change into Unistyles
 * with `UnistylesRuntime.setTheme()`, on the theory that Unistyles would re-style
 * the app natively without a React render. That stopped being true the moment
 * `useTheme` began deriving colours from this store: nothing in the app reads a
 * Unistyles theme any more — there is not a single `StyleSheet.create((theme) => …)`
 * left, and `useUnistyles()` is called nowhere.
 *
 * So the call was doing no work, and it was doing it at the worst possible moment:
 * a Nitro hop across to native in the same tick as the largest re-render the app
 * ever performs, which is switching light to dark. Every colour, every wash, every
 * card gradient and the native tab bar all change in one commit. Removing it takes
 * a native call out of that path and loses nothing, because nothing was reading the
 * result.
 *
 * `StyleSheet.configure` stays in `theme/unistyles.ts` — the Babel plugin requires
 * a configured instance or the app renders an empty tree.
 *
 * Persisted through MMKV so the first frame after launch is already correct.
 */

export type ModePreference = ThemeMode | 'system'

type ThemeState = {
  readonly accent: AccentName
  readonly mode: ModePreference
  readonly setAccent: (accent: string) => void
  readonly setMode: (mode: ModePreference) => void
}

/**
 * Resolve "system" against the OS scheme.
 *
 * `Appearance` rather than `UnistylesRuntime.colorScheme`: same answer, from React
 * Native itself, with no bridge to a library the app no longer renders through.
 */
const resolveMode = (mode: ModePreference): ThemeMode => {
  if (mode !== 'system') return mode

  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // White by default: the app starts plain, and colour is something the user
      // chooses rather than something it arrives wearing.
      accent: 'plain',
      mode: 'system',

      setAccent: (accent) => {
        // A persisted value can outlive a rename, so an unknown name must not
        // leave the app pointing at a theme that does not exist.
        if (!isAccentName(accent)) return
        set({ accent })
      },

      setMode: (mode) => {
        set({ mode })
      },
    }),
    {
      name: 'capri.appearance',
      storage: createJSONStorage(() => zustandMmkvStorage),
    },
  ),
)

/** Readable outside React — e.g. from a service reacting to an OS change. */
export const currentThemeMode = (): ThemeMode => resolveMode(useThemeStore.getState().mode)
