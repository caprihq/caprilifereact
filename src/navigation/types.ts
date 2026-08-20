/** Navigator param lists. Exported so `useNavigation` is typed everywhere. */

export type AuthStackParamList = {
  Login: undefined
  EmailSignIn: undefined
  EmailSignUp: undefined
  /**
   * `needsCode` is true when the screen must request a code itself — arriving from
   * a blocked sign-in, where nothing has been sent. Register mails one already, so
   * it arrives false and the screen sends nothing (a second request would
   * invalidate the code the user is about to type).
   */
  EmailOtp: {
    email: string
    expiresInMinutes?: number | undefined
    needsCode?: boolean | undefined
  }
  /** Token comes from the reset email, via a deep link. */
  /**
   * No params: the token cannot arrive by deep link — Base44's reset email points
   * at its own hosted page on a domain we cannot claim — so the screen collects it
   * from a paste instead.
   */
  ResetPassword: undefined
}

export type AppTabParamList = {
  Home: undefined
  Profile: undefined
}

/**
 * The tab navigator itself, for switching tabs.
 *
 * Separate from `AppNavigation` because they are different navigators: a name that
 * is not in the tabs bubbles up to the stack, so `navigate('Plan')` works through
 * either, but `navigate('Home')` only typechecks through this one.
 */
export type AppTabNavigation = {
  readonly navigate: (screen: keyof AppTabParamList) => void
}

/**
 * Signed-in stack wrapping the tabs.
 *
 * AddTask and TaskDetail are pushed as native modals rather than rendered as
 * overlay components: `presentation: 'formSheet'` gives the real UIKit sheet
 * with drag-to-dismiss, so no bottom-sheet library is needed.
 */
export type AppStackParamList = {
  Tabs: undefined
  AddTask: undefined
  AddCommitment: undefined
  TaskDetail: { taskId: string }
  Planner: undefined
  Plan: undefined
  Support: undefined
  Privacy: undefined
  Admin: undefined
  ChangePassword: undefined
}

/** Typed navigation for screens inside the signed-in stack. */
export type AppNavigation = {
  readonly navigate: <Route extends keyof AppStackParamList>(
    ...args: AppStackParamList[Route] extends undefined
      ? [screen: Route]
      : [screen: Route, params: AppStackParamList[Route]]
  ) => void
  readonly goBack: () => void
}

export type RootStackParamList = {
  Auth: undefined
  App: undefined
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

/** Typed navigation prop for screens inside the auth stack. */
export type AuthNavigation = {
  readonly navigate: <Route extends keyof AuthStackParamList>(
    ...args: AuthStackParamList[Route] extends undefined
      ? [screen: Route]
      : [screen: Route, params: AuthStackParamList[Route]]
  ) => void
  readonly goBack: () => void
}
