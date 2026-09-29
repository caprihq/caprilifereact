# CAPRI — Backlog and observations

Working notes for deciding what a future milestone should contain. Kept in the same
plain language as `Client-Update.md`: what a user would notice, not how it is built.

`Client-Update.md` says what was delivered. **This file says what is worth doing next,
and why.** They are deliberately separate — a delivery note that also lists everything
still imperfect reads as an apology rather than a handover.

---

## How this file works

Every entry has the same three parts, so entries can be compared without reading them
all:

- **What it is** — in one or two sentences, from the user's side.
- **Effort** — rough working days. A guess, but an honest one.
- **Recommendation** — do it, drop it, or decide.

Entries live under one of four headings, and move between them as things change. When
something is built, it moves out of here and into `Client-Update.md`. When something is
dropped, delete it and note the decision at the bottom.

Worth re-reading whenever a milestone is being scoped — roughly every few weeks, or
whenever a release ships.

---

## 1. Built, but nobody can use it

Things the system carries the cost of and gets nothing back from. Each is either
finished or removed; leaving them as they are is the only wrong answer.

### Focus blocks that cannot be created

**What it is.** The system knows about a thing called a focus block — a named, recurring
stretch of protected time, like "Deep work, Mon/Wed/Fri, 9–11am". When CAPRI plans a
day it is told about them, and it plans around them. But there is no screen anywhere —
not in the phone app, not in the web app — where anyone can make one. The list is
always empty, so that part of the AI's briefing is always blank.

**Effort.** About two days to add the screen. About an hour to remove the feature.

**Recommendation.** Build it. It is the single cheapest way to make auto-scheduling
visibly smarter, because the AI is already written to use it and simply never receives
anything. This is a real feature that is 80% built and 0% usable.

### A leftover from the old app

**What it is.** The app still clears out a stored sign-in detail that the previous
version left on people's phones. It only matters for someone updating from the old
version, and does nothing for anyone else.

**Effort.** Minutes.

**Recommendation.** Delete it one or two releases after this one ships, once nearly
everyone has updated. Noted here so it is not forgotten and quietly kept forever.

### A scheduled job nobody calls

**What it is.** There is a background job that marks past scheduled events as done.
Neither app ever asks for it, which means it runs only if someone set it on a timer in
the backend console — and nobody has checked whether that timer still exists.

**Effort.** Ten minutes to look.

**Recommendation.** Check it. If it is not running, users have scheduled events sitting
open forever; if it is not wanted, remove it.

---

## 2. Half-finished

Working features with an obvious missing half. Small, individually. Together they are
most of what makes an app feel unfinished.

### A commitment cannot be edited

**What it is.** A meeting can be added and removed, but not changed. When one moves by
half an hour the only route is to delete it and type it in again.

**Effort.** Half a day.

**Recommendation.** Do it. This is the most-noticed gap of the four in this section.

### No way to say "I'm working on this now"

**What it is.** The web app's Start Here card has a **Start task** button. The phone app
has open, complete, postpone and cancel — but nothing that marks a task as in progress.
Someone who starts their most important task of the day has no way to say so, and the
app cannot tell the difference between work underway and work untouched.

**Effort.** Half a day to build, once two questions are answered: does a started task
look different in the lists, and does starting a second one stop the first?

**Recommendation.** Decide, then do. It is small work waiting on a product answer, not
a technical obstacle — which is why it has sat unbuilt.

### Empty screens do not offer the next step

**What it is.** A screen with nothing on it says so and stops there. The moment someone
has nothing is exactly the moment to offer them the thing to do — "Add your first task"
rather than "No tasks".

**Effort.** Half a day.

**Recommendation.** Do it. It matters most on someone's first day, which is when people
decide whether to keep an app.

### Sign-up has no link to the terms

**What it is.** The upgrade screen links to the terms and the privacy policy; the
account-creation screen does not.

**Effort.** Half an hour.

**Recommendation.** Do it before the next submission. Apple expects it where an account
is created, and this is the kind of omission that costs a review cycle.

### Support does not say when to expect an answer

**What it is.** The contact form sends a message and says it was sent. It does not say
whether a reply takes an hour or a week, so anyone waiting has no idea whether to wait.

**Effort.** Fifteen minutes, once you decide what the answer is.

**Recommendation.** Do it — but the decision is yours, not a development task.

---

## 3. Worth more than it costs

Larger pieces. None are broken; each would make the app meaningfully more useful.

### Changes made offline are still lost

**What it is.** The app now opens on your tasks with no signal — but *changing* one
while offline still fails, and the tick undoes itself a moment later. Reading works
offline; writing does not.

**Effort.** Two to three days.

**Recommendation.** This is the natural sequel to the offline work just delivered, and
the obvious next question anyone will ask after seeing it. Holding the change and
sending it when signal returns is the whole feature.

### Only Google Calendar is read

**What it is.** CAPRI reads and writes Google Calendar. A meeting that lives in Apple
Calendar, or in a work account synced to the phone directly, is invisible — it will not
show in today's commitments, will not block auto-scheduling, and will not produce a
reminder. For anyone not on Google, the calendar features appear simply not to work.

**Effort.** Substantial, and separate work on each platform.

**Recommendation.** Decide by audience. If a meaningful share of users are on Apple or
Outlook, this is the largest single gap in the product.

### Android has no notifications at all

**What it is.** The app runs on Android, but reminders do not. The delivery route built
this milestone is Apple's, and Android needs its own.

**Effort.** Two to three days, plus a configuration file from the owner.

**Recommendation.** Decide whether Android is a shipping platform. If it is, this is not
optional — an Android user gets a task app that never reminds them of anything.

### Free-plan limits reset when the app is reinstalled

**What it is.** The daily allowances on the free plan are counted on the phone, so
deleting and reinstalling resets them. It affects free allowances only — paid features
are checked on the server and cannot be unlocked this way.

**Effort.** One to two days, mostly on the backend.

**Recommendation.** Low priority unless the free tier is being abused. Worth knowing
before anyone treats those numbers as revenue protection.

### Nothing measures what people actually do

**What it is.** There is no record of which features are used, where people stop, or
what they never find. Every decision about what to build next — including the ones in
this file — is currently informed judgement rather than evidence.

**Effort.** About a day to add; a few weeks before the data says anything.

**Recommendation.** Do it early in the next milestone rather than late. Its value is
entirely a function of how long it has been collecting.

---

## 4. Waiting on you

Not development work. Nothing in this list can be finished from the code side.

- **The Firebase configuration file.** Until it is added, the phone cannot receive a
  notification of any kind, and none of the reminder work can be tested.
- **Publishing the backend.** Four backend changes are written and not yet live:
  reminders, silent widget updates, the widget's sign-in message, and account deletion.
- **The reminder timer.** The reminder sweep needs to be set to run every five minutes
  in the backend console. It cannot be set from the code.
- **Testing on a real iPhone.** Notification taps, placing the widget, and silent
  updates cannot be verified on a simulator. This is the largest untested area.
- **Whether the widget is a paid feature.** It was built to work for everyone so it
  could be tested. That is a pricing decision, and it has not been made.

---

## 5. Decisions taken, so they are not re-litigated

- **Background refresh is done by server nudge, not by Apple's background refresh.**
  Apple's version rarely runs for an app opened once a day. Explained in full in
  `Client-Update.md`.
- **Saved task data on the phone is not encrypted.** It sits in the app's private
  storage, which iOS protects with the device passcode, and the same task titles are
  already shared with the widget. Sign-in credentials remain in the secure keychain.
- **Notifications go straight to Apple rather than through Firebase.** Fewer moving
  parts, and no third party in the delivery path. Firebase is present only to obtain
  the device's address from iOS.

---

## Notes

A scan for unused code found none — every file in the app is reachable from something
else. The entries in section 1 are unused *features*, not unused code, which is why
they are worth deciding about rather than simply deleting.

The developer-facing file `incomplete.md` covers the same ground in technical detail
and goes further in places. This file is the version for deciding what to fund.
