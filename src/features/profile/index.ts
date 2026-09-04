/** Public surface of the profile feature. */
export { ProfileScreen } from './screens/ProfileScreen'
export { PlanScreen } from './screens/PlanScreen'
export { SupportScreen } from './screens/SupportScreen'
export { PrivacyScreen } from './screens/PrivacyScreen'
/** Onboarding writes the same profile fields Profile edits, through the same hook. */
export { useUserProfile } from './services/useUserProfile'
/** The paid-gate prompt, used by whichever feature hits a limit. */
export { UpgradePrompt } from './components/UpgradePrompt'
export { useUpgradePrompt } from './hooks/useUpgradePrompt'
export type { GatedFeature } from './logic/upgradeCopy'
