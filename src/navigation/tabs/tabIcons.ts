import { Platform } from 'react-native'
import type { ImageSourcePropType } from 'react-native'
import type { AppleIcon } from 'react-native-bottom-tabs'
import type { SFSymbol } from 'sf-symbols-typescript'
import Ionicons from 'react-native-vector-icons/Ionicons'

import type { AppTabParamList } from '../types'

/**
 * Tab icons for a **native** tab bar.
 *
 * A native bar hosts platform views, not React elements, so the old
 * `TabBarIcon` component — an `<Ionicons />` element — could not be reused. The
 * bar accepts either an SF Symbol (iOS) or an image source (Android).
 *
 * The platforms are handled differently on purpose:
 *
 *  - **iOS** gets real SF Symbols, rendered by the system at the correct weight
 *    and optical size, and animated on selection like every stock app. Names are
 *    typed as `SFSymbol`, so a symbol that does not exist is a compile error
 *    rather than a blank tab.
 *  - **Android** gets Ionicons rasterised through `getImageSourceSync`, which
 *    avoids hand-authoring a drawable per icon per density.
 *
 * Both live here so the platform split is visible in one file rather than
 * smeared through the navigator.
 */

type TabName = keyof AppTabParamList

/** Filled variants read as "selected" on iOS. */
const SF_SYMBOLS: Record<TabName, { readonly on: SFSymbol; readonly off: SFSymbol }> = {
  Home: { on: 'house.fill', off: 'house' },
  Profile: { on: 'person.crop.circle.fill', off: 'person.crop.circle' },
}

const IONICONS: Record<TabName, { readonly on: string; readonly off: string }> = {
  Home: { on: 'home', off: 'home-outline' },
  Profile: { on: 'person', off: 'person-outline' },
}

/** The size Android tab bars expect. */
const ANDROID_ICON_SIZE = 24

export const tabIcon = (name: TabName, focused: boolean): ImageSourcePropType | AppleIcon => {
  if (Platform.OS === 'ios') {
    const symbol = SF_SYMBOLS[name]
    return { sfSymbol: focused ? symbol.on : symbol.off }
  }

  const glyph = IONICONS[name]
  // Tint is left to the bar, which applies its own active/inactive colour.
  return Ionicons.getImageSourceSync(
    focused ? glyph.on : glyph.off,
    ANDROID_ICON_SIZE,
  ) as ImageSourcePropType
}
