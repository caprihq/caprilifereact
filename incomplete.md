# Incomplete / known gaps

Things that are deliberately unfinished, with enough detail to pick them up later.

---

## Free-tier limits are counted on the device

Voice capture (1/day) and Up Next refreshes (3/day) live in MMKV, so a reinstall
resets them. The web client has the same weakness in `localStorage`, and two earlier
attempts at server-side counting failed because Base44's `.filter()` silently ignores
range queries.

**Plan gating itself is now enforced server-side** — `invokeAI` reads `user.plan` and
refuses paid features — so this is a spend cap, not an access control. A determined
user gets extra *free-tier* calls, not paid ones.

Which features are paid is still an inherited assumption: task parsing, subtasks and
re-prioritise require Executive; Up Next is deliberately free. That matches the web
client, but nobody has confirmed it against the plan actually being sold.

## Reminders: delivered, but the tap is unverified on a device

Reminders are complete in code. The sweep runs on a schedule, sends 30 minutes and
10 minutes before a start time, honours quiet hours in the user's own timezone, and
never notifies twice for the same start.

The tap is now wired, and the route is worth recording because the obvious approach
does not work. These pushes come **straight from APNs**, not through Firebase, and
`@react-native-firebase/messaging` only surfaces taps for messages it recognises as
FCM (they carry `gcm.message_id`). A direct APNs alert has no such key, so
`onNotificationOpenedApp` and `getInitialNotification` cannot be relied on. Instead
`AppDelegate` owns the `UNUserNotificationCenter` delegate itself: a tap parks
`capri://task/<id>` via `CapriDeepLink`, and `navigation/linking.ts` drains it through
a custom `getInitialURL` — which covers the cold-launch case, where React is not
running when the tap arrives. Whatever delegate was set before is kept and forwarded
to, so Firebase's own callbacks are not stolen.

**What is not done is proving it on hardware.** The simulator has no APNs token, so
none of this path — the tap, the parked link, or the cold-launch drain — has been
executed on a real device. It is written and reviewed, not observed.

**Android has no delivery path.** APNs is Apple-only. The router already keys on
`PushDevice.provider`, so Android is an `FCMProvider` plus a Firebase Android app and
a `google-services.json` that is not in the repo — no change to anything that sends.

## Native device calendars are not integrated

CAPRI reads and writes **Google Calendar only**, through a Base44 connector and a
browser OAuth flow. That is one integration serving both platforms, and it is why
nothing here is platform-specific.

What it does not touch is the calendar **on the device**: iOS EventKit and Android's
CalendarProvider. So a meeting that lives only in Apple Calendar, Outlook on the
phone, or a work account synced natively to the OS is invisible to CAPRI — it will
not appear in Today's Commitments, it will not block auto-scheduling, and it will not
produce a reminder.

Adding it is real work rather than a switch:

| Piece | Cost |
| --- | --- |
| iOS | EventKit, a new `NSCalendarsUsageDescription`, a permission prompt, a native module or a library, and a rebuild |
| Android | `READ_CALENDAR` permission, CalendarProvider queries, a rebuild |
| Both | a second source to merge and de-duplicate against Google, since many people sync the same account to both |

The last row is the part that is easy to underestimate: a user with Google Calendar
synced to their iPhone would see every meeting twice unless the merge de-duplicates
across sources, and there is no reliable shared identifier between a Google event and
its EventKit copy.

Worth doing when a user asks for a calendar CAPRI cannot reach. Not worth doing
speculatively.

## Nothing marks a task as started

The web client's Start Here sheet has three actions: **Start task**, which sets
`status: "in_progress"`, Skip, and View options. This app has open, complete, defer
and cancel — no way to say "I am working on this now".

`INACTIVE_STATUSES` in `logic/taskFilters.ts` deliberately keeps `in_progress`
*active* because of that: nothing here sets it, so a task carrying the status from
the web would otherwise be unreachable in every list.

Adding it is small — a mutation to `in_progress` plus a primary button on `HeroCard`
— but it needs a product decision first: whether a started task then shows
differently in All and Today, and whether starting a second task clears the first.
Left out rather than guessed at.
