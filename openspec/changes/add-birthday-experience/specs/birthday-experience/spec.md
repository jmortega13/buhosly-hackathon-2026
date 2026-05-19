## ADDED Requirements

### Requirement: User can set or clear their own birthday

The system SHALL expose `PUT /api/v1/me/birthday` accepting `{birthday: "MM-DD" | null}`. The field is owned by the authenticated user — no admin permission is needed to set or clear one's own birthday. The value is stored as a `VARCHAR(5)` MM-DD string on `users.birthday` (no year). Validation MUST reject any value that doesn't match the pattern `^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$` with HTTP 400. Day/month combinations that are invalid for that month (e.g., `02-30`, `04-31`) MUST also be rejected. The `/me` response MUST include the current value (as a string or `null`).

#### Scenario: User sets a valid birthday

- **WHEN** an authenticated user PUTs `{birthday: "05-19"}` to `/api/v1/me/birthday`
- **THEN** the system updates the user's row, responds with HTTP 200, and subsequent `/me` calls return `birthday: "05-19"`

#### Scenario: User clears their birthday

- **WHEN** an authenticated user PUTs `{birthday: null}`
- **THEN** the system sets `users.birthday` to NULL and responds with HTTP 200; subsequent `/me` calls return `birthday: null`

#### Scenario: Format rejection

- **WHEN** the request body has `birthday` in a wrong format (e.g., `"2026-05-19"`, `"5-19"`, `"may 19"`, `"5/19"`)
- **THEN** the system responds with HTTP 400 with a message identifying the field

#### Scenario: Impossible date rejection

- **WHEN** the body has `birthday: "02-30"`, `"04-31"`, `"06-31"`, etc.
- **THEN** the system responds with HTTP 400 with the message "birthday must be a valid MM-DD calendar date"

#### Scenario: Feb 29 is accepted

- **WHEN** the body has `birthday: "02-29"`
- **THEN** the system accepts and stores it (so users with leap-day birthdays can record their actual birthday — the top-up rule has separate caveats below)

### Requirement: List today's birthday-having users

The system SHALL expose `GET /api/v1/birthdays/today` returning every user whose `birthday` matches the current Asia/Manila date in MM-DD form, **excluding the requester**. Each item has the shape `{id, name, email}` (same shape as `/api/v1/users`) so the Feed UI can pre-fill the composer with a recognition. Order is by `name` ASC.

#### Scenario: One user has their birthday today

- **WHEN** today's Asia/Manila date is May 19 and exactly one user has `birthday = "05-19"` (not the requester)
- **THEN** the response is HTTP 200 with a single `{id, name, email}` item

#### Scenario: Requester's own birthday is excluded

- **WHEN** today's date matches the requester's own birthday
- **THEN** the requester does NOT appear in the response (their own celebration shows via the top-up toast, not the banner)

#### Scenario: Nobody has a birthday today

- **WHEN** no user's birthday matches today's MM-DD
- **THEN** the response is HTTP 200 with an empty array

#### Scenario: Time zone is Asia/Manila

- **WHEN** the current UTC instant is 23:00 on the 18th (07:00 on the 19th in Asia/Manila) and a user has `birthday = "05-19"`
- **THEN** that user appears in the response — the "today" comparison MUST use `LocalDate.now(ZoneId.of("Asia/Manila"))`, never the JVM default

### Requirement: One-time-per-year birthday top-up

The system SHALL automatically add the configured `app.allowance.birthday-top-up` value (default 20) to a user's `giving_balance` on the first `/api/v1/me` call of their birthday each calendar year. The fire-once guarantee MUST be enforced by storing the current year in `users.last_birthday_topup_year` inside the same transaction as the balance update; subsequent `/me` calls in the same year see the year already set and do nothing.

The check MUST happen AFTER the lazy monthly allowance refresh (so the top-up adds to the post-refresh balance, not the pre-refresh one). The `/me` response MUST include a `birthdayTopupAppliedToday` boolean which is `true` if the user's birthday is today (Asia/Manila) AND `last_birthday_topup_year` equals the current year — true throughout the day-of, regardless of whether the top-up just fired or fired earlier the same day. The frontend uses this flag to render the toast; deduplication of repeated toasts within one day is the frontend's responsibility.

#### Scenario: First /me call on the user's birthday

- **WHEN** today's Asia/Manila date matches the user's `birthday`, `last_birthday_topup_year` is NOT the current year, and the user calls `/api/v1/me`
- **THEN** the system adds the configured top-up amount to `giving_balance`, sets `last_birthday_topup_year` to the current year, returns the updated profile with `birthdayTopupAppliedToday: true`

#### Scenario: Subsequent /me calls on the same day

- **WHEN** the user has already received their birthday top-up today and calls `/me` again
- **THEN** the system does NOT change `giving_balance` and does NOT change `last_birthday_topup_year`; the response includes `birthdayTopupAppliedToday: true` (so a frontend refresh still knows it's the user's day)

#### Scenario: User without a birthday on file

- **WHEN** a user whose `birthday IS NULL` calls `/me`
- **THEN** the response includes `birthdayTopupAppliedToday: false`; no top-up is applied

#### Scenario: Not the user's birthday today

- **WHEN** today's MM-DD does not match the user's `birthday`
- **THEN** the response includes `birthdayTopupAppliedToday: false`; no top-up is applied

#### Scenario: Top-up survives admin overrides

- **WHEN** the user has a `monthly_allowance` override of 100 (set by an admin) and it's their birthday with a 20-pt top-up configured
- **THEN** their `giving_balance` ends up at `(current balance) + 20`. The override is the BASE for monthly refresh; the top-up adds on top regardless.

#### Scenario: New year resets the fire-once gate

- **WHEN** a user received the top-up last calendar year and today is their birthday in the new year
- **THEN** the top-up fires again (this is the once-per-year, not once-ever, behaviour)

### Requirement: Feb 29 caveat

The system SHALL NOT auto-top-up users whose `birthday = "02-29"` in non-leap years. In a non-leap year, no calendar date `02-29` exists, so the comparison naturally returns false. Admins MAY do a manual top-up via the existing `/api/v1/admin/users/{id}/top-up` endpoint on Feb 28 or Mar 1 if they want to honour those users.

#### Scenario: Feb 29 birthday in non-leap year

- **WHEN** the calendar year is not a leap year and a user has `birthday = "02-29"`
- **THEN** no automatic top-up fires for that user during that year; they do not appear in `GET /api/v1/birthdays/today` on either Feb 28 or Mar 1
