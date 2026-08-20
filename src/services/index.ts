/** Cross-feature I/O. Feature-specific calls live in features/<name>/services. */
export * from './api'
export * from './storage'
export * from './native'
export { initCrashReporting, setCrashUser, reportError } from './crash/crashlytics'
