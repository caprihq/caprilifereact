# CAPRI Analytics: Event Dictionary

What the CAPRI app sends to Firebase Analytics, when, and how to read it.

The code source of truth is `src/services/analytics/events.ts`. This file describes
the same events in plain words. Change both together.

---

## 1. When the numbers can be trusted

Analytics data is reliable from the day the **App Store release containing this
work** goes live. That release adds the test-vs-real tagging, the missing events and
the real screen names.

Data before that date has three known problems, and none of them can be fixed after
the fact:

- App Store customers, TestFlight testers and development builds are mixed together,
  with no way to separate them.
- Revenue includes Apple test (sandbox) purchases.
- Several events never fired, task completions were counted on Home only, and most
  screens show as "RNSScreen".

---

## 2. Filtering to real customers

Every user carries three **user properties**. Filter or compare by them in any
report.

| Property | Values | Set when |
| --- | --- | --- |
| `build_type` | `app_store`, `testflight`, `development` | At app launch, before sign-in, so even a new install's first events have it |
| `internal_user` | `yes` (otherwise not set) | At sign-in, for `@caprihq.com` accounts and Base44 admins |
| `plan` | `free`, `executive`, `chief_of_staff`, `pro` | At sign-in and whenever the plan is re-checked (after a purchase or restore) |

**Real customers** = `build_type` is `app_store` **and** `internal_user` is not `yes`.

How each property works:

- **Development builds send nothing.** Builds run from Xcode or the simulator have
  collection switched off.
- **TestFlight** is detected from the build itself, so it works before anyone signs in.
- **`internal_user` sticks to the device.** A phone a team member has signed in on
  stays marked after they sign out.
  - A team member using the **App Store** version is recognized only from their first
    sign-in on that phone. To keep all testing out of the reports, test on TestFlight.
- **Other test accounts** (for example a personal Gmail used for testing) are marked
  if they are a Base44 admin. To mark more domains, add them to
  `INTERNAL_EMAIL_DOMAINS` in `src/services/analytics/audience.ts`.
- **Android** is not tagged yet. That comes with the Android release.

---

## 3. Events

Every event is counted per user as well as in total. In Firebase, the Events report
shows both a **Count** and a **Users** column.

### Activation (new users)

| Event | Fires when | Parameters |
| --- | --- | --- |
| `first_task_created` | A new account saves its first ever task | `days_since_signup` |
| `first_up_next_success` | A new account sees its first AI-picked Up Next | `days_since_signup` |

These fire **once per account**, and only for accounts created in the last **30 days**.
Without that limit, every existing customer would trigger a "first" Up Next on the
day this release reached them.

### Tasks

| Event | Fires when | Parameters |
| --- | --- | --- |
| `task_created` | A task is saved from the Add Task sheet | `input`: `typed` / `voice`; `parser`: `ai` / `local` |
| `task_completed` | A task is marked done, from any screen | `source`: `home` / `all_tasks` / `planner` / `task_detail` |
| `task_breakdown` | CAPRI splits a task into steps | `steps`: how many |

`task_created` does not count the automatic next copy of a recurring task, only tasks
a person adds.

### Recommendations

| Event | Fires when | Parameters |
| --- | --- | --- |
| `up_next_refreshed` | Up Next gets a new ranking | `source`: `ai` (model answered) / `local` (fallback); `trigger`: `manual` ("Ask CAPRI again") / `auto` |
| `start_here_completed` | The Start Here task is marked done | `source` |
| `start_here_skipped` | The Start Here task is deferred or removed | `source` |

`start_here_completed` is also counted in `task_completed`. Comparing the two shows
what share of completed work was CAPRI's top pick.

### Smart Auto-Schedule

| Event | Fires when | Parameters |
| --- | --- | --- |
| `auto_schedule_run` | A plan comes back | `suggested`: number of suggestions |
| `auto_schedule_accepted` | One suggestion is accepted | `accepted`: always 1 |

### Upgrades

| Event | Fires when | Parameters |
| --- | --- | --- |
| `upgrade_prompted` | A free user hits a paid feature | `feature` |
| `upgrade_purchased` | A purchase completes (not on cancel) | `product`: the product id |

`upgrade_purchased` carries no price on purpose. See section 5 for revenue.

### Engagement

| Event | Fires when | Parameters |
| --- | --- | --- |
| `app_opened_from` | The app opens from a link | `source`: `widget` / `notification` / `link` |
| `onboarding_finished` | First-run setup ends | `outcome`: `completed` / `skipped` |
| `screen_view` | One of the named screens is shown | `Login`, `EmailSignUp`, `Home`, `AllTasks`, `Planner`, `TaskDetail`, `AddTask`, `AutoSchedule`, `Plan`, `Profile` |

### Recorded by Firebase itself

| Event | Meaning |
| --- | --- |
| `first_open` | First launch after install. Use it to count new users. |
| `session_start`, `user_engagement` | Sessions and time in app. These feed retention. |
| `app_update` | First launch after an update |
| `in_app_purchase` | An App Store purchase or renewal, **including Apple test purchases**. See section 5. |

---

## 4. What is never sent

The app never sends:

- task titles, notes or descriptions
- voice recordings or transcripts
- names, email addresses or anything else a person typed

Every parameter is a number or one of a fixed list of values, as shown above. The
code makes it impossible to add a free-text parameter without changing the event
list.

Accounts are identified only by their opaque Base44 user id.

---

## 5. Revenue

**RevenueCat and App Store Connect are the source of truth for revenue.** Firebase is
not.

Firebase records `in_app_purchase` on its own, and it does not separate Apple's test
purchases from real ones. In Apple's test environment a monthly subscription renews
every few minutes, up to 12 times. A single test purchase can therefore add 12 ×
$9.99 = $119.88 of "revenue" in one day.

To tell test purchases from real ones:

- **From the release with this work on:** filter `in_app_purchase` by `build_type`.
  Purchases from `testflight` and `development` builds are always test purchases.
- **RevenueCat** shows sandbox and production purchases separately (the "Sandbox
  data" toggle).
- **App Store Connect** (Sales and Trends) shows only real purchases.

---

## 6. Firebase setup (one time)

Parameters and user properties only appear in reports once they are registered.

1. **Analytics → Custom definitions → user-scoped dimensions:** `build_type`,
   `internal_user`, `plan`.
2. **Event-scoped dimensions:** `source`, `trigger`, `input`, `parser`, `outcome`,
   `feature`, `product`.
3. **Custom metrics:** `days_since_signup`, `steps`, `suggested`, `accepted`.
4. **Events → mark as key event:** `first_task_created`, `first_up_next_success`,
   `onboarding_finished`, `upgrade_purchased`.

Registration is not retroactive. Register these before the release goes live.
