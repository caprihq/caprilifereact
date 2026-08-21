import type { LinkingOptions } from '@react-navigation/native'

import { base44Config } from '@/config'
import type { RootStackParamList } from './types'

/**
 * Deep links into the app.
 *
 * Base44 emails password-reset links pointing at its own hosted client
 * (`…/reset-password?token=…`), and for a long time that looked like the end of the
 * story: claiming links on a domain you do not control needs association files served
 * from it. It turns out Base44 already serves them, for this exact app:
 *
 *   /.well-known/assetlinks.json                → com.base69aa4c4d4f33993320ae7f08.app
 *   /.well-known/apple-app-site-association     → 6672DRVT87.com.base69…app, paths ["*"]
 *
 * So the link can open the app instead of a browser, and the reset finishes without
 * leaving CAPRI. The declarations that make it work live outside this file — the
 * associated-domains entitlement on iOS, an `autoVerify` intent filter on Android —
 * and `configConstants.test.ts` keeps all three in step.
 *
 * **Only the reset path is claimed.** The association file offers `paths: ["*"]`, and
 * taking all of it would mean the app intercepting every link to the web client,
 * including its own OAuth bounce page — which would break sign-in for anyone who
 * still uses the web app.
 *
 * The `capri://` scheme is listed too. It already exists for the OAuth callback, and
 * accepting `capri://reset-password?token=…` costs nothing while giving the web page
 * a way to hand off deliberately if that is ever wanted.
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
    },
  },
}
