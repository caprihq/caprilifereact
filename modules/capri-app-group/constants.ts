/**
 * App Group identifiers, in one place.
 *
 * Deliberately import-free so this file can be pulled into app.config.ts
 * (which runs in Node at build time) as well as app code. Adding a React or
 * React Native import here would break the config load.
 *
 * ⚠️ CapriAppGroupModule.swift holds its own copy — Swift cannot import
 * TypeScript. If you change a value here, change it there too. Those are the
 * only two places these strings may appear.
 *
 * The session token is deliberately absent. It used to be published here for the
 * widget, in plaintext; it now lives only in the Keychain, in an access group the
 * widget shares (`KEYCHAIN_ACCESS_GROUP` in src/services/storage/keys.ts).
 */

export const APP_GROUP_ID = 'group.com.base69aa4c4d4f33993320ae7f08.app'
