import { AppState, Linking } from 'react-native'
import { getStateFromPath } from '@react-navigation/native'
import type { LinkingOptions } from '@react-navigation/native'

import { base44Config } from '@/config'
import { diagUrl } from '@/utils'
import { HOME_LINK_PATH, TASK_LINK_PATH, normalizeLinkPath } from '../../modules/capri-deep-link/constants'
import { takePendingLink } from '../../modules/capri-deep-link'
import type { RootStackParamList } from './types'

/**
 * Every way into a screen from outside the app.
 *
 * Three surfaces open a task — a tapped reminder, a tapped widget, and a shared
 * link — and all three go through here as the same URL. That is the point: one
 * route table, one set of rules about what a link means, rather than a bespoke
 * navigation path per surface.
 *
 * Base44 serves `apple-app-site-association` with `paths: ["*"]` for this bundle id,
 * so `https://capriforlifev1.base44.app/task/<id>` already reaches the app with no
 * change on the server.
 *
 * A task link only resolves while signed in — the App stack does not exist
 * otherwise, and React Navigation quietly drops it. That is the correct outcome for
 * a link to someone's private task, if not a friendly one.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [`${base44Config.authCallbackScheme}://`, base44Config.appBaseUrl],
  config: {
    screens: {
      // Nested to match the navigators: root → Auth → the screen itself.
      Auth: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
      App: {
        /**
         * Put the tabs under a linked screen.
         *
         * Without this, opening `capri://task/<id>` builds a stack holding only
         * TaskDetail — React Navigation does not insert a parent on its own. The
         * sheet then has nothing beneath it, so its close button raised
         * "The action 'GO_BACK' was not handled by any navigator" and the user was
         * stuck on the task with no way back to the app.
         */
        initialRouteName: 'Tabs',
        screens: {
          // Nested one level further than it looks: Home is a tab, so the path has
          // to resolve through the tab navigator or it never selects the tab.
          Tabs: {
            screens: {
              Home: HOME_LINK_PATH,
            },
          },
          TaskDetail: `${TASK_LINK_PATH}/:taskId`,
        },
      },
    },
  },

  /**
   * A cold launch has two possible sources: a real URL open, and a notification tap
   * that the app delegate parked because React was not running yet.
   */
  /** See `normalizeLinkPath`: an empty path means Home, not "stay put". */
  getStateFromPath(path, options) {
    return getStateFromPath(normalizeLinkPath(path), options)
  },

  async getInitialURL() {
    const url = (await Linking.getInitialURL()) ?? (await takePendingLink())
    // Printed in release too. "The widget opened the wrong screen" has two very
    // different causes — the wrong URL arrived, or the right one was routed
    // wrongly — and only the console can say which.
    if (url) diagUrl('link.cold', url)
    return url
  },

  /**
   * Live links, from the same two sources.
   *
   * The parked link is drained on every foreground rather than pushed from native,
   * because a tap that happens while the app is backgrounded resumes it — and
   * resuming is a moment JavaScript can observe reliably, unlike bridge readiness.
   */
  subscribe(listener) {
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      diagUrl('link.warm', url)
      listener(url)
    })

    const drain = () => {
      void takePendingLink().then((url) => {
        if (url) {
          diagUrl('link.parked', url)
          listener(url)
        }
      })
    }

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') drain()
    })

    return () => {
      urlSubscription.remove()
      appStateSubscription.remove()
    }
  },
}
