# Scheduling — step by step

How a task gets a time, and who is allowed to change it.

Throughout, one example:

- **Breakfast** — every day, 7:00, 30 minutes
- **Team standup** — from Google Calendar, 7:20 to 8:00
- **Review budget** — work. No fixed time. Takes an hour.

---

## Step 1 — Every item is one of two kinds

**Kind A — Scheduled event.** It happens at a set time. CAPRI never moves it by itself.
→ Breakfast, Team standup

**Kind B — Task.** It needs doing. CAPRI chooses when.
→ Review budget

One switch decides which: **Scheduled event**. On = A. Off = B.

### Within Kind A, one thing matters: who owns it

| Origin | Can it be changed? |
| --- | --- |
| **Google Calendar** | **No.** Not CAPRI's calendar, and not the user's alone — others may depend on it. |
| **Created in CAPRI** | **Yes**, by the user, when CAPRI asks. |

That is the only distinction needed, and it needs no new field — `origin_source`
already records it. CAPRI never edits either one on its own; the difference is only
which one it may *offer* to move.

---

## Step 2 — Creating a fixed item always asks for a time

If the switch is on, the app asks for a start time. Always.

A fixed item with no time cannot be drawn on a day, cannot reserve its slot, and
cannot be checked against anything else. It disappears.

So the app never allows one to be saved. It fills in the next half hour as a starting
point, and the user changes it.

The end time is worked out: **start + duration**. Breakfast starts at 7:00 and takes
30 minutes, so it ends at 7:30. The user is not asked twice.

---

## Step 3 — Google Calendar items are always fixed

Anything imported from Google is Kind A, automatically. No switch, no question.

The reason: it is not CAPRI's calendar. CAPRI cannot move a meeting someone else
organised.

---

## Step 4 — Setting a time on a flexible task

A user may put a time on "Review budget" without turning the switch on.

That time is a **wish, not a booking**. CAPRI tries it first, and moves the task if
something fixed needs that slot.

The app must say so, because setting a time feels like booking:

> **This time isn't protected.** CAPRI may move "Review budget" if something else
> needs 2pm.
> **[ Make it a scheduled event ]  [ Keep it flexible ]**

First button → becomes Kind A. Second → stays a wish.

---

## Step 5 — How auto-schedule runs

Six steps, in this order.

**5.1 — Collect the fixed items.**
Scheduled events, commitments, Google Calendar.
→ Breakfast 7:00–7:30, Standup 7:20–8:00

**5.2 — Note any clash between two scheduled events, and carry on.**
Breakfast and Standup overlap at 7:20. It goes on a list. Nothing stops — the rest of
the day is scheduled normally, and the clash is reviewed at the end (Step 6.2).

**5.3 — Block out their time.**
Take the working day, remove every fixed item. What is left is free time.
→ Free from 8:00 to 18:00

**5.4 — Put the flexible tasks in order.**
1. Overdue first
2. Then critical → high → medium → low
3. Then the AI's score
4. Then the nearest due date

**5.5 — Place them one by one.**
For each task, top of the list first:

- Find free gaps big enough (Review budget needs 60 minutes)
- Prefer a gap in the right part of the day — the AI reads the title and says
  "dinner" is evening, "review budget" is any time
- Then prefer the user's best hours, from their profile
- Then the earliest gap that is left
- Place it, shrink the gap, move to the next task

**5.6 — Report three lists.**
- **Suggestions** — what it proposes, ready to accept
- **Needs your decision** — the few scheduled events that overlap
- **Unplaced** — with the reason, "no gap long enough"

Order matters: the user accepts the clean suggestions first, and only then is asked
about the handful that need a judgement. Asking first would make a rare problem feel
like the main event.

**Nothing is saved.** The user accepts each suggestion one at a time.

---

## Step 6 — When two things clash

Clashes are rare. So auto-schedule does not try to be clever about them: it schedules
everything that fits, and hands back the few that do not.

### 6.1 A task clashes with anything → the task moves. Silently.

That is what a task is for. No message, no question. This covers almost every case.

### 6.2 Two scheduled events clash → CAPRI asks, once, at the end

It does not stop the plan. Everything else is scheduled first; the clash arrives as a
short review list afterwards.

**If one side is from Google, only the other side can be moved:**

> **7:20 AM — two things at once**
> Team standup 7:20–8:00 · *from Google Calendar*
> Breakfast 7:00–7:30
>
> **[ Move Breakfast ]  [ Keep both ]**

There is no "move standup" button, because CAPRI cannot change it. Offering a button
that fails is worse than not offering one.

**If neither is from Google, either side can move:**

> **[ Move Breakfast ]  [ Move Gym ]  [ Keep both ]**

**"Keep both" is always offered.** People double-book on purpose, and an app that
refuses is wrong more often than the user is.

---

**Two rules that never bend:**
- CAPRI never *shortens* anything by itself. A length is a decision. It moves things
  whole, or it asks.
- Any overlap counts. No "under five minutes is fine" — one rule is easier to trust
  than a rule with an exception.

---

## Step 7 — "Start Here" and auto-schedule must agree

Today they do not, and that is a real problem.

**Start Here** answers *what should I do now?* It ranks tasks by importance and
ignores the clock entirely.

**Auto-schedule** answers *when should each task happen?* It assigns times.

Nothing connects them. So Start Here can say "Review budget" while the plan has
Review budget booked for Thursday and something else booked for right now. Two
features, two answers, same question.

### The rule: the clock wins when it has an answer

Start Here asks three questions, in order, and stops at the first that answers.

**1. Is something locked or routine happening right now?**
Then that is the answer. Not a task to begin — the thing the user is already in.

> **Now — Team standup**  until 8:00

**2. Is a flexible task scheduled for now?**
Then that is Start Here. The plan already decided; do not overrule it.

> **Start Here — Review budget**  scheduled 9:00–10:00

**3. Nothing scheduled for now?**
Fall back to the ranking — today's behaviour, and the right answer for a user who has
never run auto-schedule.

This makes the two features one voice. A user who plans their day gets a plan that is
followed. A user who does not gets a recommendation. Neither contradicts the other.

### And the plan re-flows as the day moves

Finish early, and the rest of the day slides up. Skip something, and it moves later.
A plan that is right only at 9am is not worth making, so the remaining flexible items
are re-placed whenever one is completed, deferred or cancelled.

Locked and routine items do not slide. They are the fixed points the rest flows
around.

---

## Step 8 — Priority for a calendar item: there is none

Priority answers one question: *which flexible task gets the contested slot?*

A fixed item is never in that contest. It already owns its time. So a meeting has no
priority, and that is correct — not a gap to fill.

**Leave it empty. Do not default it to medium.** If some code forgets to check the
switch, an empty value fails loudly and a plausible one fails silently — it would
treat the meeting as ordinary work and move it.

To list fixed items in order, use **start time**.

---

## Step 9 — What to build, in order

| # | What | Where | Size |
| --- | --- | --- | --- |
| 1 | Stop auto-schedule from moving scheduled events | backend | one line |
| 2 | Let the planner see commitments — today it cannot, so it books work over them | backend | small |
| 3 | Give every scheduled event an end time | **done** | — |
| 4 | Warn when a task is given a time (Step 4) | app | small |
| 5 | Return clashes as their own list instead of ignoring them (Step 5.6) | backend | small |
| 6 | A review screen for clashes, Google side not editable (Step 6.2) | app | medium |
| 7 | Ask the AI which part of the day a task belongs to | app + schema | medium |
| 8 | Prefer the user's best hours | backend | small |
| 9 | Make Start Here follow the plan (Step 7) | app | medium |
| 10 | **Decide: one place for scheduled events, or two?** | both | a decision first |

### Start with the last one

Fixed items are stored in **two** places today:

- a task with the switch on → `Task.is_scheduled_event`
- a commitment → the `Commitment` table

**The planner reads only the first.** That is why a commitment typed in by hand is
invisible to it, and CAPRI books work straight over it.

Two ways out:

- **(a)** Commitments become scheduled-event tasks. One store. Simpler forever.
- **(b)** Keep both, and teach the planner to read both. Faster now.

I recommend **(a)**. Everything else on the list gets easier once there is one answer
to "what is fixed?".
