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

/**
 * Where the widget's tasks live.
 *
 * The app publishes what it is already showing, and the widget renders it — no
 * network call and no credential in the extension. Before this, the widget fetched
 * for itself, which meant a phone with no signal drew "Couldn't load tasks", a task
 * completed in the app stayed on the home screen for up to half an hour, and a
 * widget that had never succeeded once could not recover on a locked phone because
 * the token is unreadable there.
 */
export const WIDGET_SNAPSHOT_KEY = 'capri_widget_snapshot'

/**
 * Shape version, checked by the widget before it decodes.
 *
 * A widget ships inside the app, so both sides update together — but a decode
 * failure renders a blank rectangle on someone's home screen, and refusing an
 * unknown version instead falls back to the network path. Three lines to never
 * debug that.
 */
export const WIDGET_SNAPSHOT_SCHEMA = 1

/**
 * How old a published snapshot may be before the widget goes to the network.
 *
 * The snapshot only changes while the app runs, so someone who has not opened CAPRI
 * for a day would otherwise see yesterday's picks forever. Six hours keeps the
 * common case free of network calls and the neglected case honest.
 */
export const WIDGET_SNAPSHOT_MAX_AGE_HOURS = 6


/**
 * What the Capacitor app left behind in this same shared store.
 *
 * The old app published the **session token** here in plaintext. Upgrading to the
 * native app over the top does not remove it: the App Group container survives, so
 * a live credential would sit in an unencrypted, backed-up store forever, read by
 * nothing. The native app deletes it once, on first publish.
 */
export const LEGACY_WIDGET_TOKEN_KEY = 'capri_widget_token'


/**
 * The key a silent push carries its snapshot under.
 *
 * Read by `AppDelegate.application(_:didReceiveRemoteNotification:…)` and written by
 * the backend's push service. A mismatch is silent in the worst way: the push is
 * delivered, the app wakes, finds nothing it recognises, and the widget never
 * updates while the app is closed — with nothing in any log to say why.
 *
 * The backend copy lives in `base44/functions/sendPushNotification/entry.ts`.
 */
export const WIDGET_PUSH_PAYLOAD_KEY = 'widget_snapshot'
