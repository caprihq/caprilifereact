/**
 * Public surface of the onboarding feature.
 *
 * One screen and the hook that decides whether to show it. Everything else — the
 * answer-to-profile translation and the "have we asked?" rule — is internal and
 * tested in `logic/`.
 */
export { OnboardingSheet } from './screens/OnboardingSheet'
export { useOnboarding } from './hooks/useOnboarding'
