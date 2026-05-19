## ADDED Requirements

### Requirement: Persistent notification store

The system SHALL persist every notification as one row in a new `notifications` table keyed by `id UUID`, owned by `user_id UUID → users.id`, with a `type` discriminator (one of `recognition_received`, `giveable_refreshed`, `giveable_expiring`), a `title` and `body`, an optional `payload JSONB` for type-specific data, a `created_at TIMESTAMPTZ`, and a `read_at TIMESTAMPTZ` that is NULL until the user marks the notification as read. Rows are append-only — the system MUST NOT delete notifications after they're created.

#### Scenario: Row written when a notification fires

- **WHEN** any of the three notification triggers fires for user X
- **THEN** the system inserts a new row in `notifications` with `user_id = X.id`, `read_at = NULL`, and the appropriate `type`, `title`, `body`, and (where applicable) `payload`

### Requirement: Recognition-received notification

When user A successfully gives recognition that creates one or more recognition rows for recipient B, the system SHALL atomically insert one notification per recipient with `type = "recognition_received"`. The notification MUST live inside the same `@Transactional` boundary as the recognition itself, so a rolled-back give produces no notification.

#### Scenario: Single-recipient give

- **WHEN** user A gives `+10 @bob great work #teamwork`
- **THEN** the system inserts exactly one notification for user Bob with `type = "recognition_received"`, `title = "{A's name} recognized you (+10 points)"`, `body = "great work"` (or a truncated preview of the message), and `payload` carrying `{giverId, amount, hashtags, recognitionCreatedAt}`

#### Scenario: Multi-recipient give

- **WHEN** user A gives a recognition to three recipients
- **THEN** the system inserts three notifications — one per recipient — each shaped as in the single-recipient case

#### Scenario: Failed give produces no notification

- **WHEN** the give transaction rolls back for any reason (validation failure mid-write, DB exception)
- **THEN** no notification rows are created — the notification write is part of the same transaction

### Requirement: Giveable refreshed notification

When `AllowanceService.refreshIfNeeded` resets a user's `giving_balance` (because `giving_month` was earlier than the current Asia/Manila month), the system SHALL insert one notification with `type = "giveable_refreshed"` carrying the new balance. The notification fire MUST be idempotent for the same month — if a row already exists for that user with `type = "giveable_refreshed"` and `payload->>'month'` equal to the new `giving_month`, the system MUST NOT insert a duplicate.

#### Scenario: First /me of a new month

- **WHEN** a user calls `/me` on the 1st of a new month and the lazy refresh moves them from last month's balance to a fresh giveable budget
- **THEN** a single new notification is inserted with `type = "giveable_refreshed"`, `title = "Your <N> giveable points are ready"`, `body` mentioning the new month, and `payload = {month: "YYYY-MM", amount: <N>}`

#### Scenario: Subsequent /me in the same new month

- **WHEN** the same user hits `/me` again later that day or week
- **THEN** no additional `giveable_refreshed` notification is inserted (idempotent on month)

### Requirement: Giveable-expiring warning

A scheduled job SHALL run every day at **09:00 Asia/Manila** time. For each calendar day that is among the **last 3 days of the current month**, the job SHALL find every user with `giving_balance > 0` and insert a notification with `type = "giveable_expiring"` carrying the remaining balance and the number of days left in the month — but only if no `giveable_expiring` notification already exists for that user with the same `payload->>'month'` value.

#### Scenario: User has unspent balance on the 29th of a 31-day month

- **WHEN** the scheduled job runs on May 29 at 09:00 Asia/Manila and user X has `giving_balance = 18`
- **THEN** the system inserts one notification for X with `type = "giveable_expiring"`, `title = "18 giveable points expiring in 2 days"`, and `payload = {month: "2026-05", balance: 18, daysLeft: 2}`. Running the job again the same day (or on May 30 / 31 if the job re-runs) MUST NOT insert a duplicate for May.

#### Scenario: User has zero balance

- **WHEN** the job runs and user X has `giving_balance = 0`
- **THEN** no notification is inserted for X — nothing to warn about

#### Scenario: Outside the warning window

- **WHEN** the job runs on a day that is NOT within the last 3 days of the month (e.g., the 15th)
- **THEN** no notifications are inserted

### Requirement: List + mark-read endpoints

The system SHALL expose:

- `GET /api/v1/notifications?limit=<n>` — the caller's most recent notifications, newest first, default limit 20, max 100. Returns `[{id, type, title, body, payload, createdAt, readAt}]`.
- `GET /api/v1/notifications/unread-count` — `{count: number}` for the bell badge. Cheap query.
- `POST /api/v1/notifications/{id}/read` — marks one notification as read (sets `read_at = NOW()`). Only the owner can mark it; non-owner returns HTTP 404 to avoid leaking existence.
- `POST /api/v1/notifications/read-all` — sets `read_at = NOW()` on every unread notification for the caller. Returns `{updated: <count>}`.

#### Scenario: Mark one as read

- **WHEN** the user calls `POST /api/v1/notifications/{id}/read` on their own unread notification
- **THEN** `read_at` is set to NOW() and the response is HTTP 200 with the updated notification

#### Scenario: Mark someone else's notification as read

- **WHEN** the user calls the read endpoint on a notification owned by another user
- **THEN** the system responds HTTP 404 with the message "notification not found"; the row is not modified

#### Scenario: Mark-all

- **WHEN** the user calls `POST /api/v1/notifications/read-all` and has 7 unread notifications
- **THEN** all 7 are updated and the response is `{updated: 7}`. Already-read notifications are untouched.

### Requirement: Optional email delivery

When the application is configured with valid SMTP credentials (env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`), the system SHALL send an email mirroring each notification's title + body to the recipient user's `email`. Email sending MUST be asynchronous (`@Async`) so the API call that triggered the notification doesn't block on SMTP latency. If SMTP is not configured (host is null or blank), email sending is silently skipped; in-app notifications still fire normally.

#### Scenario: SMTP configured, notification fires

- **WHEN** SMTP is fully configured and a `recognition_received` notification is created for user X
- **THEN** the system queues an async send to X's email address with `From: <MAIL_FROM>`, subject derived from the notification's title, and a simple body containing title + body + a link back to the app
- **AND** the in-app notification is inserted regardless of whether the email queue succeeds

#### Scenario: SMTP not configured

- **WHEN** `SMTP_HOST` is unset/empty and a notification fires
- **THEN** the in-app row is inserted; no email send is attempted; no warning is logged on every fire (a single warning at startup is sufficient)

#### Scenario: SMTP send failure does not break the notification

- **WHEN** SMTP is configured but the send fails (network error, rejected by relay)
- **THEN** the failure is logged at WARN level; the in-app notification stays in place; no exception propagates back to the original API caller (because the send is async)

### Requirement: Bell icon UI

The top navigation SHALL render a bell icon visible to every authenticated user. When the user has one or more unread notifications, the icon MUST show a pink badge with the unread count (display as `9+` for counts above 9). The badge count is fetched from `/api/v1/notifications/unread-count` on initial render and re-fetched at most every 30 seconds while the bell is mounted. Clicking the bell opens a dropdown listing the 10 most recent notifications.

#### Scenario: Bell shows unread count

- **WHEN** the user has 3 unread notifications and is on any authenticated page
- **THEN** the bell icon shows a pink badge with "3"; opening the dropdown shows the notifications with their titles + bodies + relative timestamps; clicking one calls the mark-read endpoint and removes the badge contribution from that row

#### Scenario: No unread notifications

- **WHEN** the user has no unread notifications
- **THEN** the bell shows no badge; the dropdown still opens and shows recent (already-read) notifications, dimmer-styled
