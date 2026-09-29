# CAPRI's AI, in plain terms

CAPRI's AI has one job: **deciding what you should do next, and when.**

It is not a chatbot. You never have to think of a prompt or start a conversation.
It works inside the things you already do: adding a task, opening a task, looking
at your day.

There are six places it helps. Five of them ask an AI model. The sixth, calendar
scheduling, is pure arithmetic over your calendar.

---

## 1. It understands what you type or say

**Where:** the New Task screen, typing or with the microphone.

You write one line the way you would say it out loud:

> "dinner with Sam tomorrow 7pm, 90 minutes"

CAPRI reads it and fills in the details for you:

- **Title:** Dinner with Sam
- **When:** tomorrow, 19:00
- **How long:** 90 minutes
- **Category:** Personal

You get a "Looks right?" screen to confirm. Nothing is saved until you say so.

---

## 2. It decides how urgent a new task is

**Where:** the moment you tap Save. You do not have to do anything.

Every task gets a priority, a score out of 100, and one short sentence explaining
itself:

> **Send the contract** &nbsp;·&nbsp; High
> *Due tomorrow, and your afternoon is already booked.*

Two things make this more useful than a label you pick yourself. The score is what
orders your lists, so genuinely urgent work rises without you sorting anything. And
the judgement takes your day into account: the same task is treated differently on
a free morning than on a day with six hours of meetings.

---

## 3. It tells you what to start right now

**Where:** the home screen, under **Start Here** and **Up Next**.

CAPRI looks at everything on your list and picks the three that deserve your
attention, each with a reason:

> **Start Here**
> **Dinner** &nbsp;·&nbsp; *A little overdue, let's go*
>
> **Up Next**
> **Wedding invitations** &nbsp;·&nbsp; *This one's been waiting*

If the answer feels wrong, tap **Ask CAPRI again** and it will think again.

Two rules keep it honest: nothing without a near deadline can be the number one
suggestion while something is due within two days, and a closer deadline always
beats a more important distant one.

---

## 4. It breaks a big task into steps

**Where:** open any task, then the **Steps** section.

Some tasks are impossible to start because they have no obvious first move. Ask
CAPRI to break one down and you get three to six concrete steps you can tick off:

> **Plan Q4 offsite**
> ○ Confirm the date with the leadership team
> ○ Shortlist three venues
> ○ Get quotes and compare
> ○ Book and send invites
>
> Steps 0/4

Every step is yours to edit: rename it, delete it, add your own, tick it off. If you
ask again, CAPRI offers a fresh breakdown rather than adding more steps to the old
one.

---

## 5. It can re-think a task you disagree with

**Where:** open a task, then **Re-prioritise**.

Sometimes a task changes meaning after you write it. Re-prioritising asks CAPRI to
look again and explain its answer:

> Now high priority.
> *You have three days left and this blocks two other things.*

---

## 6. It finds real time in your calendar

**Where:** Daily Planner, then **Smart Auto-Schedule**.

This one does not use an AI model at all. It is careful arithmetic:

1. Rank what is still to do, by urgency and importance.
2. Look at the next seven days, inside your working hours only.
3. Remove anything already taken: meetings in your Google Calendar, and time you
   have already blocked out in CAPRI.
4. Suggest up to five real slots, each with a reason.

You accept or dismiss each suggestion one at a time. **Nothing goes in your calendar
until you accept it.**

---

## What is free and what is not

| | Free | Executive |
| --- | --- | --- |
| Understanding what you type | Dates and keywords | Full understanding |
| Priority on save | Automatic score | Judged against your day |
| Start Here and Up Next | **Yes**, 3 refreshes a day | Unlimited |
| Voice capture | 1 task a day | Unlimited |
| Breaking a task into steps | Not included | Yes |
| Re-thinking a task | Not included | Yes |
| Smart Auto-Schedule | Not included | Yes |

Start Here and Up Next are deliberately free. Knowing what to do next is the point
of CAPRI, not an upsell.

---

## When the AI cannot be reached

CAPRI keeps working. It never shows you an empty screen because a request failed.

- **Typing a task** still fills in dates, durations and categories from the words
  you used ("tomorrow", "30 min", "urgent").
- **Priority** still gets scored from the deadline, the wording and the category.
- **Start Here and Up Next** fall back to CAPRI's own ranking, which uses the same
  urgency and importance rules. You see plainer reasons, in the same order.

The one thing that changes is the writing. Explanations become shorter and more
generic. Nothing disappears.

---

## What CAPRI shares, and what it does not

To answer "what should I do now", CAPRI sends the model:

- your task titles, categories, deadlines and estimated durations
- your working hours, timezone, and preferences such as preferred task length
- **today's** commitments and calendar events, with their titles and times, so it
  knows how full your day already is

It does not send your email address, your password, your payment details, or any
calendar day other than today. Notes you write on a task are sent only for the task
being worked on.

---

## What the AI never does on its own

- It never creates, completes or deletes a task by itself.
- It never puts anything in your calendar without you accepting it.
- It never sends you a notification. Reminders are set by the clock, not by AI:
  30 minutes and 10 minutes before something starts, and never during your quiet
  hours.
- It never runs in the background. Every AI feature happens because you opened a
  screen or pressed something.

---

## Status

Everything described here is built and working in the app. The AI features run
through the CAPRI backend, which is pending its next deployment. Until that happens
they quietly use the fallbacks described above, so the app behaves normally and the
explanations are simply plainer.
