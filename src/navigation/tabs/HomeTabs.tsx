import { useMemo } from 'react'
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation'

import { ProfileScreen } from '@/features/profile'
import { NativeHomeScreen } from '@/features/tasks'
import { useTheme } from '@/hooks/useTheme'
import { tabIcon } from './tabIcons'
import type { AppTabParamList } from '../types'

const Tabs = createNativeBottomTabNavigator<AppTabParamList>()

/**
 * Signed-in tabs — a **real** platform tab bar.
 *
 * `UITabBarController` on iOS and `BottomNavigationView` on Android, rather than
 * `@react-navigation/bottom-tabs`, which renders a plain React `View` styled to
 * look like one. That distinction buys native press feedback and ripple, the
 * system blur/translucency behind the bar, and iOS's scroll-to-top when the
 * active tab is tapped again — none of which a JS bar can provide.
 *
 * The cost, accepted deliberately: a native bar follows the platform. Only tint
 * colours are ours, so a bespoke CAPRI tab bar is off the table while this is
 * native.
 *
 * Tab state is preserved by the navigator, so the web client's hand-rolled
 * keep-alive in Layout.jsx — every tab mounted behind `display: none`, plus
 * manual scroll save and restore — is deleted rather than ported.
 */
export const HomeTabs = () => {
  const theme = useTheme()
  /**
   * Memoised because this crosses to a **native** view.
   *
   * An inline object is a new identity on every render, and a theme change
   * re-renders this navigator — so the native bar was being handed a fresh style to
   * reconfigure itself with in the middle of the app's largest commit, which is the
   * light/dark switch. Reconfiguring a `UITabBarController` or
   * `BottomNavigationView` mid-commit is exactly the kind of thing that takes a
   * process down, and it costs nothing to stop doing it.
   */
  const tabBarStyle = useMemo(
    () => ({ backgroundColor: theme.colors.footerSurface }),
    [theme.colors.footerSurface],
  )

  return (
    <Tabs.Navigator
      // Read in JS rather than a stylesheet: these cross the bridge to the
      // native bar, which no style can reach.
      tabBarActiveTintColor={theme.colors.accentInk}
      tabBarInactiveTintColor={theme.colors.textMuted}
      // Where the page's wash ends, so the bar continues the gradient instead of
      // capping it with a plain slab.
      tabBarStyle={tabBarStyle}
      // Let the platform draw its own translucency over our surface colour.
      translucent
      // Android ripple and selection pill, so presses feel native there too.
      rippleColor={theme.colors.accent}
      activeIndicatorColor={theme.colors.fill}
      hapticFeedbackEnabled
    >
      <Tabs.Screen
        name="Home"
        component={NativeHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('Home', focused),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => tabIcon('Profile', focused),
        }}
      />
    </Tabs.Navigator>
  )
}
