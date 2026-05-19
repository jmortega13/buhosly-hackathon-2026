## Why

Users currently have no way to know when something happens to them in buhosly — when someone recognises them, when their monthly giveable balance refreshes, or when their unspent giveable allowance is about to expire. The feed shows the world's activity, not yours specifically. A targeted notification stream (in-app + optional email) closes that loop so users feel the points moving in and out, and so giveable points don't quietly evaporate at month-end.

## What Changes

- Add a persistent `notifications` table — one row per logical event per user, never deleted. Powers a bell-icon dropdown in the top nav with an unread badge.
- **Recognition received**: when user A gives recognition to user B (one or more), the system inserts one notification per recipient with the giver's name, the amount, the message preview, and a link to the feed.
- **Giveable refreshed**: when `AllowanceService.refreshIfNeeded` rolls a user forward to a new month, it inserts a "Your N giveable points are ready" notification.
- **Giveable expiring soon**: a `@Scheduled` job runs every morning at 09:00 Asia/Manila. On the last 3 days of the calendar month, it scans users whose `giving_balance > 0`, and for each one that doesn't already have an `expiring` notification for the current month, inserts a "You have N giveable points expiring in <X> days" warning.
- **Optional email delivery**: when SMTP is configured (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM` env vars), the notification service sends the same content as email via `JavaMailSender`, asynchronously so the API request isn't blocked. If SMTP is unconfigured, the in-app notification still fires; email is silently skipped.
- Bell icon in the top nav with an unread count badge, polled every 30s. Clicking opens a dropdown listing the 10 most recent notifications. Each item shows an icon, title, body preview, relative timestamp. Clicking an item marks it as read + navigates where applicable (recognition received → `/feed`, expiring/refreshed → `/give` if reintroduced, otherwise `/profile`).

## Capabilities

### New Capabilities

- `notifications`: A persistent per-user event stream with three trigger types (`recognition_received`, `giveable_refreshed`, `giveable_expiring`), plus the bell-icon UI, unread tracking, and optional async email delivery.

### Modified Capabilities

<!-- The give-recognition, points-ledger, and existing /me flows acquire side-effects (fire notifications) but their request/response contracts don't change, so no delta is needed in those specs. -->

## Impact

- **Schema**: Flyway `V11__notifications.sql` adds the `notifications` table + two indexes (user-by-created-desc and a partial index on unread).
- **Backend**: new `notifications/` package (`Notification` entity, `NotificationRepository`, `NotificationService`, `EmailService`, `NotificationsController`, `ExpiryWarningScheduler`). `RecognitionService.give` and `AllowanceService.refreshIfNeeded` get one-line hooks to fire the relevant notifications.
- **Spring**: `@EnableScheduling` on the main application class (or a dedicated config). `@EnableAsync` for fire-and-forget email sending.
- **Dependencies**: add `spring-boot-starter-mail` to the Gradle build for `JavaMailSender`.
- **Config**: `app.mail.from` + `spring.mail.host/port/username/password` env-driven; SMTP empty = email disabled, in-app still works.
- **Frontend**: bell icon component in `nav.ts`, dropdown with unread count + list, polled via `setInterval`. New ApiService methods, new `Notification` type.

## Out of scope

- Per-user notification preferences ("mute X notifications") — uniform delivery for the hackathon.
- Browser push notifications (Web Push API + service worker).
- Real-time pushed updates (Server-Sent Events / WebSocket). The bell badge polls.
- Digest emails (one daily summary instead of per-event).
