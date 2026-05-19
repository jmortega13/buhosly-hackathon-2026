## Why

Admins want a single screen that answers two questions: *what kind of effort is the org appreciating most?* and *who is being appreciated the most?*. Today the only admin surfaces are users, rewards, and redemptions — there is no way to see the shape of recognition activity. A simple Reports page (top hashtags + top earners) gives the admin enough signal to write the periodic recognition write-up without exporting and pivoting raw data.

## What Changes

- Add a new admin route `/admin/reports` (gated by the existing `adminGuard` / `ROLE_ADMIN`) with a "Reports" tab in the admin nav.
- Add two backend endpoints under `/api/v1/admin/reports/**`:
  - `GET .../hashtags?window=month|all` — returns the top hashtags by recognition count for the selected window, plus the total points awarded under each tag.
  - `GET .../leaderboard?window=month|all` — returns the top 10 users by points **received** in the selected window, with recognition count.
- The frontend Reports page shows the two lists side by side with a single window toggle (**This month** / **All time**) shared by both lists. Default is **This month** so admins see what is currently happening.
- Reports are computed at query time from the `recognitions` table — no new tables, no caching layer. Window cutoff for `month` is "first day of the current Asia/Manila month at 00:00", consistent with how the giving allowance refreshes.

Out of scope: custom date ranges, CSV export of report data, hashtag drill-down (which recognitions used a tag), giver-side leaderboard, per-team filters, charting/visualisation.

## Capabilities

### New Capabilities

- `admin-reports`: Admin-only read-only views over recognition activity. Two endpoints (top hashtags, top earners) parameterised by a `window` (`month` or `all`).

### Modified Capabilities

- `admin-dashboard`: gains a new tab — adds a "Reports" surface to the admin nav alongside Users / Rewards / Redemptions.

## Impact

- **New code (frontend)**: `src/app/pages/admin/admin-reports/admin-reports.ts` (standalone Angular component), one route entry, one extra tab in `admin-tabs.ts`, two new methods + two new row types on `ApiService` / `types.ts`.
- **New code (backend)**: `AdminReportsController` in `com.synacy.buhosly.admin` with two `@GetMapping`s. Aggregation is done in Java against the existing `RecognitionRepository` — the Recognition entity already exposes `hashtags()`, `recipientId()`, `amount()`, and `createdAt()`, which is everything the aggregation needs.
- **Data store**: No schema changes, no migrations.
- **Operational risks**: The reports load every recognition in the window and aggregate in memory. At hackathon scale (hundreds of rows) this is fine; if the table grows to tens of thousands, the aggregation should move to SQL (a follow-up — left out of scope here).
- **Affected systems**: The admin nav (`admin-tabs`) and the admin route table.
