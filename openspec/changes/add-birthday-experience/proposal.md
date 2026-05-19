## Why

Birthday recognition is a high-signal, low-effort moment in workplace culture — exactly the kind of thing the recognition feed should celebrate. Bonusly does it via Google Calendar / HRIS sync, but those routes are heavy (sensitive OAuth scopes, vendor integrations). The user explicitly chose **self-entered birthday** as the simpler path. This change unlocks three small features that make buhosly feel alive without that infrastructure cost.

## What Changes

- Add an optional `birthday` field (MM-DD only — no year, so we don't store DOB) to every user, settable from the user's own Profile page. Editing it requires no admin permission; it's the user's own data.
- Show a **"🎂 It's <Name>'s birthday today"** banner at the top of the Feed for every active user whose birthday matches today (Asia/Manila local date). Clicking the banner pre-fills the composer with a birthday-themed recognition (`+10 @<handle> Happy birthday! 🎂 #birthday `) and focuses the textarea so the user can edit and send in two keystrokes.
- **Auto-gift** the celebrant a configurable number of **earned points** (redeemable for rewards — `earned_balance`, not `giving_balance`) on the first `/api/v1/me` call of their birthday each year. Default 20 pts; env-overridable. The intent is a gift the celebrant can spend on themselves; adding to giving allowance would just make them work harder on their own birthday. The top-up fires AT MOST once per year per user, recorded by writing the current year into a new `last_birthday_topup_year` column. The user sees a one-shot celebratory toast.

## Capabilities

### New Capabilities

- `birthday-experience`: User-entered birthday field, endpoint to list today's birthday-having users, automatic one-time-per-year giving balance top-up on a user's birthday, and the flag the API returns so the frontend can show a celebratory toast exactly once.

### Modified Capabilities

<!-- None — `user-auth` keeps its current shape; the new optional column is additive and out-of-scope for that capability's requirements. -->

## Impact

- **Schema**: Flyway `V10__birthdays.sql` adds two nullable columns to `users` (`birthday VARCHAR(5)` with a regex CHECK, `last_birthday_topup_year INTEGER`). No data migration needed.
- **Backend**: new `BirthdayService` in a `birthdays/` package; `MeController` gains a `PUT /api/v1/me/birthday` and includes `birthday` + `birthdayTopupAppliedToday` in the `/me` response; new `BirthdaysController` for `GET /api/v1/birthdays/today`.
- **AppProperties**: `Allowance.birthdayTopUp: int` (default 20); `application.yml` reads `${BIRTHDAY_TOP_UP:20}`.
- **Frontend**: Profile page adds a birthday picker; Feed page renders the banner row above the composer and uses `@ViewChild` to call a new `composer.prefillBirthday(user)` method; the celebratory toast is dedup'd via localStorage so a page reload doesn't re-show it.
- **Out of scope**: birthday emails, calendar sync, age-based logic, retroactive top-ups for users who set their birthday after the date has passed (admin can manually top up).

## Known caveats

- Feb 29 birthdays do not auto-top-up in non-leap years. Admin can do a manual top-up. Documented in the spec.
- A user who sets their birthday to today (after the day has started) **does** get the top-up on the same `/me` call. We don't gate by "must have been set before midnight."
- The `#birthday` hashtag isn't pre-seeded in the `hashtags` table; the first use creates it via the existing upsert.
