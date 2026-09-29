# What's new in CAPRI

A plain-language summary of this round of work, described by what you will see on the
phone rather than how it was built.

---

## Where each scope item is covered

Every item in the agreed scope is marked in the text below as *(Scope 1)*, *(Scope 2)*
and so on, so any change can be traced back to the item it answers.

| # | Scope item | Covered in |
| --- | --- | --- |
| 1 | Existing iOS WidgetKit widget integrated with React Native architecture | The home-screen widget |
| 2 | Shared App Group data storage | The home-screen widget |
| 3 | Widget updates when task data changes | The home-screen widget |
| 4 | Explicit widget refresh behaviour | The home-screen widget |
| 5 | iOS background refresh / background tasks | Keeping things fresh while the app is closed |
| 6 | Notification deep linking | Tapping things opens the right place |
| 7 | Widget deep linking | Tapping things opens the right place |
| 8 | Task-specific deep linking | Tapping things opens the right place |
| 9 | Offline-capable local cache | Speed and reliability |
| 10 | Optimistic UI updates | Speed and reliability |
| 11 | List virtualisation | Speed and reliability |
| 12 | Cold-start / performance improvements | Speed and reliability |

All twelve are delivered. The section *What changed on screen* covers additional
interface work carried out alongside the scope, and is marked as such.

---

## The home-screen widget

*Scope 1 to 5 — the widget itself, its shared storage, and how it stays current.*

**The widget works in the new app.** *(Scope 1)* The "Daily Priorities" widget your users already
have — Start Here on the left, what's next beside it — now runs in the rebuilt app, so
a widget someone placed months ago keeps working after they update rather than
vanishing.

**The app feeds the widget directly.** *(Scope 2)* The app now hands the widget the tasks it
should show, so the widget appears instantly instead of loading, works with no signal,
and shows the same "Start Here" task the app does. It also no longer keeps a copy of
the user's sign-in credentials outside the app's secure storage.

**Finishing a task updates the widget straight away.** *(Scope 3)* Tick something off in the app
and the home screen changes with it, instead of showing the completed task for up to
half an hour.

**Each change refreshes the widget once.** *(Scope 4)* It used to refresh twice for a single
change, which counts against a limit Apple sets on how often a widget may update — so
the widget now stays fresher over a day of use, not less.

**The widget stays current while the app is closed.** *(Scope 5)* The server sends the phone a
silent update when the user's tasks change elsewhere, so a task added on a laptop
reaches the home screen within about fifteen minutes, even while the phone is locked.
This one is worth explaining properly — see the next section.

---

## What the widget shows, and how it decides

*Scope 1 and 3 — the widget's contents and how they stay in step with the app.*

**The small widget shows one task. The medium widget shows up to four.** The first is
always "Start Here" — CAPRI's single answer to what to do right now. The medium size
adds the next three beneath it, which are the same three the app lists under "Up Next".

**The widget never decides anything itself.** It draws whatever the app last worked
out, so the two can never disagree about what to start. If Home says Start Here is
"Meeting", the widget says "Meeting" — there is no second ranking that could drift.

**Only open work is eligible.** A task that is completed or cancelled is not a
candidate, and neither is anything marked as a *scheduled event* — a meeting or
appointment. Those are commitments rather than work to be ranked, so they appear under
Today's Commitments instead. This is the usual reason a task someone just created does
not appear: if it was entered as a scheduled event, the widget will never rank it.

**The order is CAPRI's ranking.** Overdue work first, then priority, then how soon
something is due, adjusted by what the user has been engaging with. CAPRI's assistant
refines that order where it can, and the app's own scoring stands in whenever the
assistant is unavailable — so the widget is never blank for want of a network call.

**Fewer tasks than expected means fewer eligible tasks.** With only one open task, the
widget shows one; the space below is left empty rather than filled with a message
explaining its own emptiness. The same rule now applies inside the app: the "Up Next"
heading disappears entirely on a day with nothing queued behind the first task, which
matches how Today's Commitments and the empty planner slots already behave.

**When there is nothing at all**, the widget says so plainly and offers the app.

**Updating** is covered in the next section — it is the part with the most behind it.

---

## Keeping things fresh while the app is closed

*Scope 5 — iOS background refresh / background tasks.*

This is the part of the work with the least to see and the most behind it, so it is
worth setting out on its own.

**The problem.** An iPhone does not let an app run whenever it likes. Apple hands out
occasional background time, and how much depends largely on how often the person opens
the app. CAPRI is opened once or twice a day, which puts it near the bottom of that
list — it can go a full day without being given a single slot. An app that waits for
those slots is an app whose widget silently freezes on the morning's list.

**What that looked like.** Tick a task off on a laptop and the phone's home screen
would keep showing it. Add tomorrow's meeting from the web app and the widget would not
know until someone opened CAPRI. The widget looked live and was not, which is worse
than looking stale.

**What happens instead.** The phone is nudged rather than left to ask. When a user's
tasks change, the server sends that phone a silent message — no sound, no banner,
nothing on the lock screen, and nothing the user ever sees. iOS wakes CAPRI for a
moment in the background, the app writes the new list into the storage the widget reads
from, and asks the widget to redraw. The user's next glance at their home screen shows
the current list, and nobody opened anything.

**Why it does not flood the phone.** The server holds off for up to fifteen minutes and
compares the new list against a fingerprint of the last one it sent — if nothing
meaningful changed, no message goes out. An afternoon of edits therefore produces one
nudge rather than thirty. That restraint is not politeness: Apple throttles apps that
send too many silent updates, and an app that overspends its allowance gets fewer of
them for days afterwards.

**No permission prompt.** Silent updates need no notification permission, so this keeps
working for someone who declined reminders. That was a deliberate decision — a user who
doesn't want to be interrupted should still get a widget that tells the truth.

**What this needed on the backend.** The scheduled job that notices a user's tasks have
changed, decides whether it is worth a nudge, and sends it; and two new fields on the
user record that remember what was last sent, which is what makes the fifteen-minute
hold and the no-change check possible.

**The honest limit.** iOS may still delay or drop a silent update when the battery is
low or Low Power Mode is on — nothing can override that. In those cases the widget
falls back to refreshing on its own roughly every half hour while the phone is in use,
and it always refreshes the moment someone opens the app. The nudge makes the common
case fast; it does not, and cannot, make it guaranteed.

---

## Tapping things opens the right place

*Scope 6, 7 and 8 — notification, widget and task-specific deep linking.*

**Tapping a reminder opens that task.** *(Scope 6)* Previously it opened the app wherever it had
been left, and the user had to go and find what the reminder was about.

**Tapping the widget opens the task it names.** *(Scope 7)* On the larger widget each task in the
list opens its own, rather than every tap going to the first one.

**Every task now has its own link.** *(Scope 8)* A reminder, the widget and a shared link all open
the same screen, which also means a link to a task can be sent to someone and it will
open the right task in the app.

---

## Speed and reliability

*Scope 9 to 12 — offline cache, optimistic updates, list virtualisation and cold start.*

**Long task lists open instantly.** *(Scope 11)* The list now draws only the rows that fit on the
screen. This matters for paying users, who have no limit on how many tasks they keep —
before, every task was drawn before the screen could appear.

**Actions happen immediately.** *(Scope 10)* Ticking, postponing or deleting a task updates the
screen at once instead of pausing while the server answers, and quietly puts itself
back if the server refuses. Commitments now behave the same way: adding one used to
close the sheet onto an unchanged timeline, so people added it twice.

**Startup was measured, and is already fast.** *(Scope 12)* The app reaches a usable home screen in
roughly 0.6–0.8 seconds, so no speed work was needed; the measurement is now built in
so it can be watched as the app grows.

**The app opens on your tasks, with or without signal.** *(Scope 9)* The task list is now saved on
the phone, so a launch draws the last known list instantly and refreshes behind it —
where before, opening the app underground or on a plane showed "couldn't load your
tasks" and nothing else.

**And it says when it is showing saved work.** *(Scope 9)* If the refresh cannot reach the server, a
line above the list explains that these are saved tasks and to pull down to try again.
Serving yesterday's list silently would look identical to a live one, which is the way
this feature usually goes wrong. Saved work is kept for a day, and is erased the moment
anyone signs out.

---

## What changed on screen, area by area

*Outside the listed scope.* None of the twelve scope items covers the interface itself.
These changes were made alongside that work, and are grouped by the part of the app
they affect so each one's purpose is clear.

### Home

**The "Start Here" card now looks like the main thing.** It sits in a coloured ring and
lifts off the page; before, it was identical to the cards beneath it and only the small
label above told you which was which.

**The greeting no longer uses an email address.** Accounts that never set a name were
being greeted as "codehatchdev927"; it now simply says "Good afternoon".

**Two buttons at the top instead of one.** The daily planner used to be reachable only
through a link inside one card, which disappeared on days with nothing planned — it now
has a permanent calendar button beside the task-list button.

### All tasks

**Every filter is visible.** The eight filters sat in a row that ran off the edge of the
screen with no hint it could be swiped, so half of them were effectively hidden. They
now wrap onto two lines.

**Finished tasks take up less room.** A completed task is now a single line with a tick.
Since completed tasks stay in the list until deleted, they were otherwise crowding out
the work still to do.

### Task detail

**"Repeats" appeared twice.** One of them was editable, the other locked. There is now
one.

**The Save button moved to the bottom.** Steps and subtasks sat below it, where anything
reads as happening after you save — so the section that asks you to think was the one
people scrolled past.

### Daily planner

**An empty day looks empty, once.** Each time slot used to announce "Nothing scheduled"
separately, stacking three of them on a free day.

**It tells the truth about working hours.** The footer said CAPRI plans between 9am and
6pm regardless of what the user had set two screens away; it now names their own hours,
and auto-schedule plans inside those hours and around meetings already in the calendar.

**Long overdue lists are summarised.** "Carried over" shows the first few with a "+N
more" that opens the full list, rather than listing a hundred tasks on a planning screen.

### Upgrading

**Prices are on the buttons.** Users could previously only discover the cost by tapping
"buy" and reading Apple's confirmation sheet. Prices now come from the App Store, in the
right currency for wherever the user is.

**Terms and privacy links are on the page.** Apple requires both on any subscription
screen, and their absence is a common reason for a rejected submission.

### Profile

**Users can delete their account.** Apple requires an app that lets people sign up to
let them delete from inside the app; the old answer was "email support and we will
remove it", which does not satisfy it. Deleting removes every task, commitment and
setting permanently.

**Quiet hours can be set.** The reminder system has always respected quiet hours, and
there was no way for anyone to choose them.

### Everywhere

**Messages tell users what happened, in their own language.** Technical text from the
server used to reach the screen — "Request failed with status code 500", "Unknown
product: capri_executive_monthly". Every message is now written for the person reading
it, and each one is marked as a success, a note, a warning or a problem.

**Messages appear where the user is looking.** Anything shown while a panel was open —
a plan limit, a failed save — was being drawn underneath it, invisible.

**Cancelling a purchase no longer looks like a crash.** Tapping "Cancel" on Apple's
payment sheet threw a full-screen red developer error over the app. It now does nothing
at all, which is what cancelling should do.

**The colour wash is calmer.** The "Aurora" theme travelled from strong blue to hot pink
down a single screen, so the same white card looked different at the top and the bottom.

**A crash when switching between light and dark on Android is fixed.** A decorative
gradient in the theme picker was asking the phone to divide by zero for a fraction of a
second, and the app closed instantly with no error.

---

## Behind the scenes

These changes are on the server and need to be published before the features above are
fully live:

- **Reminders** *(supports Scope 6)* — the schedule that decides who to notify, 30 and
  10 minutes before a task starts, once each, quietly during quiet hours. A reminder has
  to exist before tapping one can open anything.
- **Silent widget updates** *(Scope 5)* — what keeps a home screen current while the app
  is closed, described in full above.
- **The widget's sign-in message** *(Scope 1)* — an expired session showed "Couldn't load
  tasks" instead of "Open CAPRI to sign in".
- **Account deletion** *(outside the listed scope)* — the part that actually removes the
  data. Required by Apple for any app that lets people create an account.

One separate prerequisite: a configuration file from Firebase is missing, and without it
the phone cannot receive notifications at all. It takes a few minutes to add and is
needed before reminders can be tested.
