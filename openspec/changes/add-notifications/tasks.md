## 1. Backend infrastructure

- [x] 1.1 Add `spring-boot-starter-mail` to `backend/build.gradle.kts`.
- [x] 1.2 Enable `@EnableScheduling` and `@EnableAsync` on a new `SchedulingConfig` class (or on `BuhoslyApplication`) so both annotations work.
- [x] 1.3 Add `app.mail.from: ${MAIL_FROM:}` to `application.yml`; add `spring.mail.host / port / username / password` reading from `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`. Document the five env vars in `backend/.env.example`.
- [x] 1.4 Flyway `V11__notifications.sql` creates the `notifications` table (`id, user_id, type, title, body, payload JSONB, created_at, read_at`) with indexes on `(user_id, created_at DESC)` and a partial index on `(user_id) WHERE read_at IS NULL`.

## 2. Backend domain

- [x] 2.1 `Notification` JPA entity with the seven columns + getters/setters; `NotificationRepository` extends `JpaRepository<Notification, UUID>` with `findAllByUserIdOrderByCreatedAtDesc(Pageable)`, `countByUserIdAndReadAtIsNull(UUID)`, and a derived `existsByUserIdAndTypeAndPayloadContaining(...)` (or use a `@Query` checking JSONB).
- [x] 2.2 `NotificationService` with three create methods (`recognitionReceived`, `giveableRefreshed`, `giveableExpiring`) and three read methods (`recent`, `unreadCount`, `markRead`, `markAllRead`). Each create method inserts the row + invokes `emailService.send(notification, recipient)` (async).
- [x] 2.3 `EmailService` wraps `JavaMailSender`. Method `send(notification, user)` is `@Async`, no-ops if `spring.mail.host` is null/blank, otherwise builds a `SimpleMailMessage` with the title as the subject and the body + a link as the text. Catches and logs `MailException` so async failures don't propagate.
- [x] 2.4 Wire `NotificationService.recognitionReceived` into `RecognitionService.give` — inside the existing transaction, after the recipient balance update, for each recipient.
- [x] 2.5 Wire `NotificationService.giveableRefreshed` into `AllowanceService.refreshIfNeeded` — fired AFTER the persist, idempotent on month via the `existsBy…` check inside the service.
- [x] 2.6 `ExpiryWarningScheduler` with `@Scheduled(cron = "0 0 9 * * *", zone = "Asia/Manila")`. Method body: if today is among the last 3 days of the month, find users with `giving_balance > 0` and for each (idempotently per month) call `NotificationService.giveableExpiring`.
- [x] 2.7 `NotificationsController` with `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`. All require the standard JWT auth.
- [x] 2.8 Update `AllowanceServiceTest` to construct `AppProperties` with the new `Mail` record so the build stays green.

## 3. Frontend

- [x] 3.1 Add `Notification` interface and `NotificationType` union to `types.ts`.
- [x] 3.2 Add ApiService methods: `notifications()`, `unreadNotificationCount()`, `markNotificationRead(id)`, `markAllNotificationsRead()`.
- [x] 3.3 Add a bell-icon component (or extend `nav.ts` inline) that:
  - Renders the bell with a pink count badge when unread > 0
  - On click, opens a dropdown listing the 10 most recent notifications fetched via `notifications()`
  - Polls `unreadNotificationCount()` every 30s while mounted
  - On notification click: marks as read, closes the dropdown, navigates by type (`recognition_received` → `/feed`, others → `/profile`)
  - Has a "Mark all as read" button at the bottom of the dropdown

## 4. Verification

- [ ] 4.1 Backend builds; all existing tests still pass.
- [ ] 4.2 Frontend builds; the new bell + dropdown render cleanly.
- [ ] 4.3 OpenSpec validates the new change.
- [ ] 4.4 Manual: give yourself a recognition → bell shows 1, dropdown lists "X recognized you (+N)". Mark read → badge clears. Set backdated `giving_month` in psql → next `/me` triggers a refreshed notification. Force `ExpiryWarningScheduler` by setting your system clock or invoking it manually via a dev-only endpoint.
