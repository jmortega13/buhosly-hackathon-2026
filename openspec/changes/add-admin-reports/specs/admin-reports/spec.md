## ADDED Requirements

### Requirement: Admin reports endpoints are admin-gated

Every endpoint under `/api/v1/admin/reports/**` SHALL require `ROLE_ADMIN`. Non-admin requests MUST receive HTTP 403 with the message "admin only", consistent with the rest of the admin surface.

#### Scenario: Non-admin attempts to read a report

- **WHEN** an authenticated user without `ROLE_ADMIN` calls `GET /api/v1/admin/reports/hashtags` or `GET /api/v1/admin/reports/leaderboard`
- **THEN** the system responds with HTTP 403 and the message "admin only"

#### Scenario: Unauthenticated request

- **WHEN** the request omits a valid `Authorization: Bearer …` header
- **THEN** the system responds with HTTP 401

### Requirement: Report window parameter

Each report endpoint SHALL accept an optional `window` query parameter with the values `month` (default) or `all`. Any other value MUST be rejected with HTTP 400 and the message "window must be 'month' or 'all'". The `month` window covers recognitions whose `createdAt` is on or after the first day of the **current Asia/Manila month at 00:00**, matching the timezone used by the giving allowance refresh. The `all` window includes every recognition ever recorded.

#### Scenario: Default window is the current month

- **WHEN** an admin calls `GET /api/v1/admin/reports/hashtags` with no `window` parameter
- **THEN** the response covers recognitions in the current Asia/Manila month only

#### Scenario: Explicit all-time window

- **WHEN** an admin calls `GET /api/v1/admin/reports/leaderboard?window=all`
- **THEN** the response covers every recognition ever recorded, with no time cutoff

#### Scenario: Invalid window value

- **WHEN** an admin calls a report endpoint with `?window=quarter` (or any value other than `month` / `all`)
- **THEN** the response is HTTP 400 with the message "window must be 'month' or 'all'"

### Requirement: Top hashtags report

The system SHALL expose `GET /api/v1/admin/reports/hashtags` returning the top 20 hashtags by recognition count for the requested window. For each hashtag the response MUST include the tag string, the number of recognitions that used it, the total points awarded under that tag (sum of `recognitions.amount`), and the timestamp of the most recent recognition that used it. Results MUST be ordered by `recognitionCount DESC`, breaking ties by `pointsTotal DESC` and then by `lastUsedAt DESC`. Hashtags that have no usage in the window MUST NOT appear.

The aggregation MUST be computed from the `recognitions` table — not from the `hashtags.usage_count` column — so the count reflects per-recognition usage and respects the window. A recognition that lists the same tag twice (after normalisation) is counted once.

#### Scenario: Listing top hashtags this month

- **WHEN** an admin calls `GET /api/v1/admin/reports/hashtags?window=month`
- **THEN** the response is HTTP 200 with a JSON array of up to 20 items, each `{tag: string, recognitionCount: number, pointsTotal: number, lastUsedAt: string}`, ordered by `recognitionCount DESC, pointsTotal DESC, lastUsedAt DESC`, including only hashtags that appear on at least one recognition in the current Asia/Manila month

#### Scenario: All-time hashtag totals

- **WHEN** an admin calls `GET /api/v1/admin/reports/hashtags?window=all`
- **THEN** the response covers every recognition ever recorded; the `recognitionCount` for a tag equals the total number of recognition rows whose `hashtags` list contains that tag

#### Scenario: Empty window

- **WHEN** no recognitions exist in the requested window (e.g., the month just rolled over)
- **THEN** the response is HTTP 200 with an empty array

#### Scenario: Recognitions with no hashtag are ignored

- **WHEN** the window contains recognitions that were given without any hashtag
- **THEN** those recognitions contribute nothing to the report; only recognitions whose `hashtags` list is non-empty are aggregated

### Requirement: Top earners leaderboard

The system SHALL expose `GET /api/v1/admin/reports/leaderboard` returning the top 10 users by points **received** in the requested window. For each entry the response MUST include the user's id, name, email, the total points received in the window (sum of `recognitions.amount` where the user is the recipient), and the number of recognitions received. Results MUST be ordered by `pointsReceived DESC`, breaking ties by `recognitionCount DESC` and then by `name ASC`. Users who received no recognitions in the window MUST NOT appear.

The aggregation MUST be computed from the `recognitions` table — not from `users.earned_balance` — because `earned_balance` is reduced by redemptions and therefore does not reflect appreciation received in a window.

#### Scenario: Listing top earners this month

- **WHEN** an admin calls `GET /api/v1/admin/reports/leaderboard?window=month`
- **THEN** the response is HTTP 200 with a JSON array of up to 10 items, each `{user: {id, name, email}, pointsReceived: number, recognitionCount: number}`, ordered by `pointsReceived DESC, recognitionCount DESC, name ASC`, covering only recognitions in the current Asia/Manila month

#### Scenario: All-time leaderboard

- **WHEN** an admin calls `GET /api/v1/admin/reports/leaderboard?window=all`
- **THEN** the response covers every recognition ever recorded; a user's `pointsReceived` equals the sum of all amounts they have received as a recipient since the org started

#### Scenario: Leaderboard excludes users who received nothing

- **WHEN** the window contains a user who has given recognitions but never received any
- **THEN** that user does NOT appear in the leaderboard, regardless of their `earned_balance` from before the window

#### Scenario: Empty window

- **WHEN** no recognitions exist in the requested window
- **THEN** the response is HTTP 200 with an empty array

### Requirement: Reports page in the admin UI

The admin dashboard SHALL include a "Reports" tab routed at `/admin/reports` that renders both reports on one page with a shared **This month / All time** window toggle and a shared **Table / Chart** view toggle. The window toggle MUST default to **This month**; the view toggle MUST default to **Chart**. When the window toggle is flipped, both lists MUST re-fetch from their respective endpoints with the matching `window` value. The view toggle MUST switch the presentation in place without re-fetching data. The page MUST show a loading state while either request is in flight and an empty-state message ("No activity in this window yet.") when both lists come back empty for the selected window.

#### Scenario: Admin opens the Reports tab

- **WHEN** an admin navigates to `/admin/reports`
- **THEN** the page issues `GET /api/v1/admin/reports/hashtags?window=month` and `GET /api/v1/admin/reports/leaderboard?window=month` in parallel, then renders the two lists side by side (or stacked on narrow viewports)

#### Scenario: Admin switches the window toggle

- **WHEN** an admin on the Reports tab clicks **All time**
- **THEN** the page re-fetches both reports with `window=all` and replaces the displayed data; the previously displayed data is shown with a dim/loading state until the new data arrives

#### Scenario: Admin switches the view toggle to Chart

- **WHEN** an admin on the Reports tab clicks **Chart**
- **THEN** the two cards re-render as horizontal bar charts using the data already in memory: the Top hashtags chart bars are sized by `recognitionCount`, and the Top earners chart bars are sized by `pointsReceived`; no network request is made. Switching back to **Table** restores the tabular view, again with no network request.

#### Scenario: Non-admin attempts the route

- **WHEN** a non-admin (or an unauthenticated user) navigates to `/admin/reports`
- **THEN** the existing `adminGuard` redirects to `/feed`, exactly as it does for the other admin routes — there is no per-page bypass
